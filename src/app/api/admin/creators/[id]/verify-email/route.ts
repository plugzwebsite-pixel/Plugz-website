import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Marking a creator's email verified by hand.
 *
 * A creator whose link expired, or never arrived, is stuck on the status page
 * with no way forward: the dashboard gate needs emailVerified set and the
 * admin screens had no override. This is that override, recorded against the
 * signed-in admin. Any outstanding links are cleared at the same time, so a
 * stale one cannot be used later.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-verify-email"), 30, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const profile = await db.creatorProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, name: true, email: true, emailVerified: true } },
    },
  });
  if (!profile) return fail("That creator no longer exists.", 404);

  if (profile.user.emailVerified) return ok({ alreadyVerified: true });

  await db.$transaction([
    db.user.update({
      where: { id: profile.userId },
      data: { emailVerified: new Date() },
    }),
    db.emailVerificationToken.deleteMany({ where: { userId: profile.userId } }),
  ]);

  return ok({ verified: true, email: profile.user.email });
}
