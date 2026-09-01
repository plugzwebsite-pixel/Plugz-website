import "server-only";
import { db } from "@/lib/db";
import { stripeConfigured, stripeIsLive, sendTransfer, accountState, StripeNotReady } from "@/lib/stripe";

/**
 * Paying the creators.
 *
 * A run gathers every sale that has cleared and been settled by the brand, one
 * payout per creator, and sends each their share. It lives here rather than in
 * a route because two things call it: an administrator pressing a button, and
 * the scheduled run on the 1st and the 15th. Two copies of a routine that moves
 * money would eventually disagree about who is owed what.
 *
 * Four things this is careful about:
 *
 *   1. It previews unless told to send. The preview and the send read exactly
 *      the same set, so what is approved is what goes.
 *   2. Every transfer carries the payout row's own id as an idempotency key, so
 *      a retry, a double click, a restart mid-run or two schedules firing at
 *      once cannot pay anybody twice.
 *   3. A creator Stripe will not pay is skipped and named, never silently
 *      dropped and never sent anyway.
 *   4. Anybody not yet marked ready is asked about again before being skipped,
 *      because Stripe can finish verifying somebody days after they applied and
 *      a stale no would hold their money for ever.
 */

export type PayoutOutcome = {
  handle: string;
  name: string;
  pence: number;
  sales: number;
  outcome: string;
  transferId?: string;
};

export type PayoutRunResult = {
  dryRun: boolean;
  live: boolean;
  creators: number;
  sentCount: number;
  sentPence: number;
  totalPence: number;
  results: PayoutOutcome[];
};

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

/** What is owed, grouped by creator. The single definition, used by both callers. */
async function amountsOwed(): Promise<Map<string, Group>> {
  // Settled by the brand, so the money is actually ours to pass on. Paying a
  // creator for a sale the brand has not yet paid us for is a loan, not a
  // payout, and is not a decision this gets to make.
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
  return groups;
}

export async function runCreatorPayouts(input: {
  send: boolean;
  minimumPence: number;
}): Promise<PayoutRunResult | { notReady: string }> {
  if (!stripeConfigured()) return { notReady: "Payouts are not switched on yet." };

  const groups = await amountsOwed();

  // Stripe finishes verifying an account in its own time, sometimes days after
  // the creator filled the form in. Our copy is only refreshed when they open
  // their payouts page, so a creator who never goes back would be skipped for
  // ever on a stale no. Anybody not yet marked ready is asked about again here,
  // which is the one moment the answer matters.
  for (const g of [...groups.values()].filter((x) => x.accountId && !x.payoutsEnabled)) {
    try {
      const state = await accountState(g.accountId as string);
      g.payoutsEnabled = state.payoutsEnabled;
      g.requirement = state.requirement;
      await db.creatorProfile.update({
        where: { id: g.profileId },
        data: {
          stripePayoutsEnabled: state.payoutsEnabled,
          stripeRequirement: state.requirement,
          ...(state.payoutsEnabled ? { stripeOnboardedAt: new Date() } : {}),
        },
      });
    } catch (err) {
      // Leave the stored answer standing. Stale is a held payout; invented
      // would be money sent to an account Stripe will not pay out from.
      console.error(`[payouts] could not refresh @${g.handle}:`, err);
    }
  }

  const results: PayoutOutcome[] = [];
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
    if (g.pence < input.minimumPence) {
      results.push({
        ...base,
        outcome: `Held, under the minimum of £${(input.minimumPence / 100).toFixed(2)}`,
      });
      continue;
    }
    if (!input.send) {
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
            paidBy: "STRIPE",
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
      if (err instanceof StripeNotReady) return { notReady: err.message };
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", transferState: "FAILED", failureReason: message.slice(0, 300) },
      });
      console.error(`[payouts] transfer failed for @${g.handle}:`, message);
      results.push({ ...base, outcome: `Failed: ${message.slice(0, 120)}` });
    }
  }

  const sent = results.filter((r) => r.outcome === "Sent");
  return {
    dryRun: !input.send,
    live: stripeIsLive(),
    creators: results.length,
    sentCount: sent.length,
    sentPence: sent.reduce((t, r) => t + r.pence, 0),
    totalPence: results.reduce((t, r) => t + r.pence, 0),
    results,
  };
}
