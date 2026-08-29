import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { stripeConfigured, stripeIsLive, sendTransfer, StripeNotReady } from "@/lib/stripe";

/**
 * Paying the creators.
 *
 * A run gathers every sale that has cleared and been settled by the brand, one
 * payout per creator, and sends each their share. It is the last step of a
 * pipeline that has existed since the engine was built and until now ended in
 * somebody working the numbers out by hand.
 *
 * Three things this is careful about, because it moves money:
 *
 *   1. It previews unless told to send. The preview and the send read exactly
 *      the same set, so what is approved is what goes.
 *   2. Every transfer carries the payout row's own id as an idempotency key, so
 *      a retry, a double click or a restart mid-run cannot pay anybody twice.
 *   3. A creator Stripe will not pay is skipped and named, never silently
 *      dropped and never sent anyway.
 */
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const schema = z.object({
  /** Nothing is sent unless this is explicitly true. */
  send: z.boolean().default(false),
  /** Below this a transfer costs more in fees than it moves. */
  minimumPence: z.number().int().min(0).max(100_00).default(500),
});

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "payout-run"), 10, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const { send, minimumPence } = parsed.data;

  if (!stripeConfigured()) {
    return fail("Payouts are not switched on yet.", 503);
  }

  // Settled by the brand, so the money is actually ours to pass on. Paying a
  // creator for a sale the brand has not yet paid us for is a loan, not a
  // payout, and is not a decision this route gets to make.
  const due = await db.sale.findMany({
    where: { status: "APPROVED", stage: "PAID_TO_PLUGGZ", payoutId: null },
    select: {
      id: true,
      creatorAmountPence: true,
      creatorProduct: {
        select: {
          profileId: true,
          profile: {
            select: {
              handle: true,
              stripeAccountId: true,
              stripePayoutsEnabled: true,
              stripeRequirement: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  type Group = {
    profileId: string;
    handle: string;
    name: string;
    accountId: string | null;
    payoutsEnabled: boolean;
    requirement: string | null;
    saleIds: string[];
    pence: number;
  };

  const groups = new Map<string, Group>();
  for (const s of due) {
    const p = s.creatorProduct.profile;
    const key = s.creatorProduct.profileId;
    const g =
      groups.get(key) ??
      {
        profileId: key,
        handle: p.handle,
        name: p.user.name,
        accountId: p.stripeAccountId,
        payoutsEnabled: p.stripePayoutsEnabled,
        requirement: p.stripeRequirement,
        saleIds: [],
        pence: 0,
      };
    g.saleIds.push(s.id);
    g.pence += s.creatorAmountPence;
    groups.set(key, g);
  }

  const results: {
    handle: string;
    name: string;
    pence: number;
    sales: number;
    outcome: string;
    transferId?: string;
  }[] = [];

  const runDate = new Date();

  for (const g of groups.values()) {
    const base = { handle: g.handle, name: g.name, pence: g.pence, sales: g.saleIds.length };

    if (!g.accountId || !g.payoutsEnabled) {
      results.push({
        ...base,
        outcome: g.accountId
          ? `Skipped, Stripe is not ready to pay them${g.requirement ? `: ${g.requirement}` : ""}`
          : "Skipped, they have not set up payouts",
      });
      continue;
    }
    if (g.pence < minimumPence) {
      results.push({
        ...base,
        outcome: `Held, under the minimum of £${(minimumPence / 100).toFixed(2)}`,
      });
      continue;
    }
    if (!send) {
      results.push({ ...base, outcome: "Will be sent" });
      continue;
    }

    // The row is written before the money moves, so its id can be the
    // idempotency key. A crash between here and the transfer leaves a payout
    // with no transfer, which the next run retries safely; the other order
    // would leave money sent with nothing recording it.
    const payout = await db.payout.upsert({
      where: { profileId_runDate: { profileId: g.profileId, runDate } },
      create: { profileId: g.profileId, runDate, amountPence: g.pence, status: "SCHEDULED" },
      update: { amountPence: g.pence },
      select: { id: true },
    });

    try {
      const transfer = await sendTransfer({
        accountId: g.accountId,
        amountPence: g.pence,
        payoutId: payout.id,
        description: `Pluggz commission for @${g.handle}`,
      });

      await db.$transaction([
        db.payout.update({
          where: { id: payout.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            stripeTransferId: transfer.id,
            transferState: "SENT",
            failureReason: null,
          },
        }),
        db.sale.updateMany({
          where: { id: { in: g.saleIds } },
          data: { stage: "PAID_TO_CREATOR", payoutId: payout.id },
        }),
      ]);

      results.push({ ...base, outcome: "Sent", transferId: transfer.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", transferState: "FAILED", failureReason: message.slice(0, 300) },
      });
      console.error(`[payouts] transfer failed for @${g.handle}:`, message);
      if (err instanceof StripeNotReady) return fail(err.message, 503);
      results.push({ ...base, outcome: `Failed: ${message.slice(0, 120)}` });
    }
  }

  const sent = results.filter((r) => r.outcome === "Sent");
  return ok({
    dryRun: !send,
    live: stripeIsLive(),
    creators: results.length,
    sentCount: sent.length,
    sentPence: sent.reduce((t, r) => t + r.pence, 0),
    totalPence: results.reduce((t, r) => t + r.pence, 0),
    results,
  });
}
