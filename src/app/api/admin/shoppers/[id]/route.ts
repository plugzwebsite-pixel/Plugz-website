import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Deleting a shopper account.
 *
 * Shoppers hold no sales or payouts, but the guard is kept anyway: roles
 * change, and a check that costs one query is cheaper than a missing one.
 * The profile, saved items and follows all cascade from the user row.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-shopper-delete"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const account = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!account || account.role !== "SHOPPER") {
    return fail("That shopper account no longer exists.", 404);
  }

  const [sales, payouts] = await Promise.all([
    db.sale.count({
      where: { creatorProduct: { profile: { userId: id } } },
    }),
    db.payout.count({ where: { profile: { userId: id } } }),
  ]);

  if (sales > 0 || payouts > 0) {
    return fail(
      "This account has recorded sales or payouts and cannot be deleted.",
      409
    );
  }

  await db.user.delete({ where: { id } });

  return ok({ removed: true });
}
