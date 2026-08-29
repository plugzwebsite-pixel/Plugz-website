import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Recording a creator payment that was made outside the platform.
 *
 * Stripe is the easy path and the one that needs nobody to do anything. This
 * is the other one: a bank transfer somebody made by hand, which until now had
 * nowhere to be written down. Without it a platform not using Stripe would show
 * every creator as permanently unpaid, and the person doing the transfers would
 * be keeping the real record in their own head.
 *
 * It pays exactly what a Stripe run would have paid, from the same query, so
 * the two routes can never disagree about who is owed what. The sales are
 * claimed in the same transaction that writes the payout, so a creator cannot
 * be recorded as paid twice for the same sale, whichever way the money went.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  profileId: z.string().min(1),
  /** The bank reference, so the entry can be matched to a statement later. */
  reference: z.string().trim().min(1, "Enter the bank reference").max(120),
  /** Defaults to today. Set it when catching up on a transfer made earlier. */
  paidOn: z.coerce.date().optional(),
});

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "payout-record"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const { profileId, reference } = parsed.data;
  const paidOn = parsed.data.paidOn ?? new Date();

  if (paidOn.getTime() > Date.now() + 60_000) {
    return fail("That date is in the future.", 422, { paidOn: "Pick a date that has happened" });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { id: profileId },
    select: { id: true, handle: true },
  });
  if (!profile) return fail("That creator doesn't exist.", 404);

  let result: { ok: true; amountPence: number; sales: number } | { ok: false; reason: string };

  try {
    result = await db.$transaction(async (tx) => {
      const due = await tx.sale.findMany({
        where: {
          status: "APPROVED",
          stage: "PAID_TO_PLUGGZ",
          payoutId: null,
          creatorProduct: { profileId },
        },
        select: { id: true, creatorAmountPence: true },
      });
      if (due.length === 0) {
        return { ok: false as const, reason: "There is nothing owed to that creator." };
      }

      const amountPence = due.reduce((t, s) => t + s.creatorAmountPence, 0);

      const payout = await tx.payout.create({
        data: {
          profileId,
          runDate: paidOn,
          amountPence,
          status: "SENT",
          sentAt: paidOn,
          paidBy: "BANK_TRANSFER",
          reference,
        },
        select: { id: true },
      });

      // Guarded on payoutId still being null, so a Stripe run happening at the
      // same moment cannot claim the same sales.
      const claimed = await tx.sale.updateMany({
        where: { id: { in: due.map((s) => s.id) }, payoutId: null },
        data: { stage: "PAID_TO_CREATOR", payoutId: payout.id },
      });
      if (claimed.count !== due.length) {
        throw new Error("Those sales were being paid by another run. Nothing was recorded.");
      }

      return { ok: true as const, amountPence, sales: due.length };
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : "Unknown error";
    // A payout already exists for that creator on that date, which is exactly
    // what the unique constraint is there to catch: the same transfer recorded
    // twice.
    if (code === "P2002") {
      return fail("A payment for that creator on that date is already recorded.", 409);
    }
    console.error("[payouts/record] could not record:", message);
    return fail(message.slice(0, 160), 409);
  }

  if (!result.ok) return fail(result.reason, 422);

  return ok({
    recorded: true,
    handle: profile.handle,
    amountPence: result.amountPence,
    sales: result.sales,
  });
}
