import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireRole } from "@/lib/auth/guard";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";

/**
 * Reissuing a creator's verification link from the admin side.
 *
 * The public resend endpoint only works for the signed-in account itself, so
 * an admin helping a stuck creator could never use it on their behalf. Same
 * 24-hour link, same single-use rule, sent to the creator's own address.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-resend-verification"), 10, 60_000);
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

  // Supersede any outstanding links so an old one can't be used later.
  await db.emailVerificationToken.deleteMany({ where: { userId: profile.userId } });

  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: profile.userId, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendVerificationEmail(profile.user.email, profile.user.name, raw);

  return ok({ sent: true, email: profile.user.email });
}
