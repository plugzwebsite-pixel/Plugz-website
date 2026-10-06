import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import type { CreatorStatus } from "@prisma/client";

const schema = z.object({
  action: z.enum(["approve", "decline", "suspend", "reinstate", "feature", "unfeature"]),
});

const nextStatus: Record<string, CreatorStatus> = {
  approve: "APPROVED",
  decline: "DECLINED",
  suspend: "SUSPENDED",
  reinstate: "APPROVED",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid action", 400);

  const profile = await db.creatorProfile.findUnique({ where: { id } });
  if (!profile) return fail("Creator not found", 404);

  const updated = await db.creatorProfile.update({
    where: { id },
    data:
      parsed.data.action === "feature"
        ? { featured: true }
        : parsed.data.action === "unfeature"
          ? { featured: false }
          : { status: nextStatus[parsed.data.action] },
    select: { id: true, status: true, featured: true },
  });

  return ok(updated);
}

/**
 * Deleting a creator removes the whole account.
 *
 * The profile id arrives, the user row goes: the profile, their listings,
 * videos, saved items and follows all cascade from it. Refused while any
 * financial record exists, because sales and payouts are the platform's
 * books, not just the creator's. Suspending keeps someone off the site while
 * the history stays intact.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-creator-delete"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const profile = await db.creatorProfile.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!profile) return fail("That creator no longer exists.", 404);

  const [sales, payouts] = await Promise.all([
    db.sale.count({ where: { creatorProduct: { profileId: id } } }),
    db.payout.count({ where: { profileId: id } }),
  ]);

  if (sales > 0 || payouts > 0) {
    return fail(
      "This creator has recorded sales or payouts and cannot be deleted. Suspend them instead.",
      409
    );
  }

  await db.user.delete({ where: { id: profile.userId } });

  return ok({ removed: true });
}
