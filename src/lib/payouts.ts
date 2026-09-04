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
 * Five things this is careful about:
 *
 *   1. It previews unless told to send. The preview and the send read exactly
 *      the same set, so what is approved is what goes.
 *   2. The sales are claimed before the money moves, not after. Writing the
 *      claim first is what stops two runs paying the same commission twice:
 *      reading the amounts owed and sending the transfer are not one step, and
 *      anything that reads in the gap sees sales nobody has taken yet. The
 *      claim is a single guarded write, so of two runs reaching it together
 *      exactly one wins and the other is told so.
 *   3. Every transfer carries the payout row's own id as an idempotency key, so
 *      a retry, a double click or a restart mid-run cannot pay anybody twice.
 *   4. A creator Stripe will not pay is skipped and named, never silently
 *      dropped and never sent anyway.
 *   5. Anybody not yet marked ready is asked about again before being skipped,
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

/** Raised when another run claimed these sales first. Nothing was written. */
class ClaimLost extends Error {}

/**
 * Take the sales, then pay for them.
 *
 * The payout row and the claim on the sales are written together, and the claim
 * only counts sales still spoken for by nobody. If another run got there first
 * the count comes back short, the whole thing is rolled back, and this creator
 * is left to that run rather than paid a second time. The row exists before any
 * money moves so that its id can be the idempotency key.
 */
async function claimSales(g: Group, runDate: Date): Promise<{ id: string }> {
  try {
    return await db.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          profileId: g.profileId,
          runDate,
          amountPence: g.pence,
          status: "SCHEDULED",
        },
        select: { id: true },
      });

      const claimed = await tx.sale.updateMany({
        where: { id: { in: g.saleIds }, payoutId: null },
        data: { payoutId: payout.id },
      });
      if (claimed.count !== g.saleIds.length) throw new ClaimLost();

      return payout;
    });
  } catch (err) {
    // Two runs starting in the same millisecond collide on the one payout a
    // creator may have per run date. Same situation, same answer.
    if ((err as { code?: string })?.code === "P2002") throw new ClaimLost();
    throw err;
  }
}

/**
 * Payouts that claimed their sales but never finished sending.
 *
 * A crash, a timeout or a refusal between the claim and the transfer leaves
 * money owed and sales nobody else will pick up, because they are already
 * claimed. Rather than releasing them, which would risk a second transfer for
 * one that had in fact gone through, the same payout row is retried under its
 * own idempotency key. Stripe answers a repeated key with the original
 * transfer, so this either finishes the job or reports why it cannot.
 */
async function resumeUnfinished(send: boolean): Promise<PayoutOutcome[]> {
  const stuck = await db.payout.findMany({
    where: { status: { in: ["SCHEDULED", "FAILED"] }, sales: { some: {} } },
    select: {
      id: true,
      amountPence: true,
      failureReason: true,
      profile: {
        select: {
          handle: true,
          stripeAccountId: true,
          stripePayoutsEnabled: true,
          user: { select: { name: true } },
        },
      },
      _count: { select: { sales: true } },
    },
  });

  const out: PayoutOutcome[] = [];

  for (const p of stuck) {
    const base = {
      handle: p.profile.handle,
      name: p.profile.user.name,
      pence: p.amountPence,
      sales: p._count.sales,
    };

    if (!send) {
      out.push({ ...base, outcome: "Unfinished from an earlier run, will be retried" });
      continue;
    }
    if (!p.profile.stripeAccountId || !p.profile.stripePayoutsEnabled) {
      out.push({ ...base, outcome: "Unfinished, and Stripe is still not ready to pay them" });
      continue;
    }

    try {
      const transfer = await sendTransfer({
        accountId: p.profile.stripeAccountId,
        amountPence: p.amountPence,
        payoutId: p.id,
        description: `Pluggz commission for @${p.profile.handle}`,
      });

      await db.$transaction([
        db.payout.update({
          where: { id: p.id },
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
          where: { payoutId: p.id },
          data: { stage: "PAID_TO_CREATOR" },
        }),
      ]);

      out.push({ ...base, outcome: "Sent", transferId: transfer.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.payout.update({
        where: { id: p.id },
        data: { status: "FAILED", transferState: "FAILED", failureReason: message.slice(0, 300) },
      });
      out.push({ ...base, outcome: `Still failing: ${message.slice(0, 120)}` });
    }
  }

  return out;
}

export async function runCreatorPayouts(input: {
  send: boolean;
  minimumPence: number;
}): Promise<PayoutRunResult | { notReady: string }> {
  if (!stripeConfigured()) return { notReady: "Payouts are not switched on yet." };

  // Anything half done from last time is finished before new work is taken on,
  // so a creator owed from a run that fell over is paid first rather than last.
  const resumed = await resumeUnfinished(input.send);

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

    // Claimed before the money moves. Until this succeeds another run could be
    // looking at the same sales; after it, they are spoken for and no other run
    // will see them.
    let payout: { id: string };
    try {
      payout = await claimSales(g, runDate);
    } catch (err) {
      if (err instanceof ClaimLost) {
        results.push({
          ...base,
          outcome: "Skipped, another run is already paying these sales",
        });
        continue;
      }
      throw err;
    }

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
          where: { payoutId: payout.id },
          data: { stage: "PAID_TO_CREATOR" },
        }),
      ]);

      results.push({ ...base, outcome: "Sent", transferId: transfer.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // The claim is left in place deliberately. These sales belong to this
      // payout now, and the next run retries it under the same idempotency key,
      // which is the only way to retry without risking a second transfer for
      // one that had actually gone through.
      await db.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", transferState: "FAILED", failureReason: message.slice(0, 300) },
      });
      console.error(`[payouts] transfer failed for @${g.handle}:`, message);

      if (err instanceof StripeNotReady) return { notReady: err.message };
      results.push({ ...base, outcome: `Failed: ${message.slice(0, 120)}` });
    }
  }

  results.unshift(...resumed);

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
