import "server-only";
import { db } from "@/lib/db";

/**
 * Moving a sale from pending to verified once its return window has passed.
 *
 * This is the step the whole payout pipeline was waiting on and nothing was
 * doing. Every sale is written with a `verifiesAt` date, the payout screens
 * display it, the invoices count on it, and Analytics only counts sales that
 * reached APPROVED. Without something to act on that date a sale stayed pending
 * for ever, so the dashboards read a permanent zero however much was actually
 * sold, and every commission would have had to be worked out by hand.
 *
 * The rule is deliberately narrow. A sale becomes verified when its return
 * window has passed and nothing has happened to it in the meantime: a refund,
 * a cancellation or an open dispute all keep it where it is. Verified means the
 * refund risk is over, not that anyone has been paid, so it moves the stage to
 * VERIFIED and no further. Money moving is a separate, human decision.
 *
 * Safe to run as often as you like. It only ever looks at sales that are still
 * pending and whose date has passed, so running it twice in a minute does
 * nothing the second time.
 */

export type VerifySweep = {
  scanned: number;
  verified: number;
  heldByDispute: number;
  ranAt: Date;
};

export async function verifyDueSales(now = new Date()): Promise<VerifySweep> {
  const due = await db.sale.findMany({
    where: {
      status: "PENDING",
      stage: "PENDING",
      verifiesAt: { lte: now },
    },
    select: {
      id: true,
      // An open dispute is exactly the case where the window passing means
      // nothing, so those are counted and left alone rather than swept up.
      disputes: { where: { resolvedAt: null }, select: { id: true } },
    },
  });

  const clear = due.filter((s) => s.disputes.length === 0).map((s) => s.id);
  const held = due.length - clear.length;

  if (clear.length === 0) {
    return { scanned: due.length, verified: 0, heldByDispute: held, ranAt: now };
  }

  // Re-checked in the update rather than trusted from the read above, so two
  // overlapping runs cannot verify the same sale twice.
  const done = await db.sale.updateMany({
    where: { id: { in: clear }, status: "PENDING", stage: "PENDING" },
    data: { status: "APPROVED", stage: "VERIFIED", verifiedAt: now },
  });

  return {
    scanned: due.length,
    verified: done.count,
    heldByDispute: held,
    ranAt: now,
  };
}

/** What is waiting, for a screen that wants to say so without changing anything. */
export async function pendingVerificationCounts(now = new Date()) {
  const [due, notYet] = await Promise.all([
    db.sale.count({ where: { status: "PENDING", stage: "PENDING", verifiesAt: { lte: now } } }),
    db.sale.count({ where: { status: "PENDING", stage: "PENDING", verifiesAt: { gt: now } } }),
  ]);
  return { due, notYet };
}
