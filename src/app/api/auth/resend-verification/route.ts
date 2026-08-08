import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Issue a fresh email-verification link.
 *
 * The status page has always offered "Resend verification email" but there was
 * nothing behind it — the button pointed at the page that *consumes* a token.
 * A creator whose link expired after its 24 hours, or who never received the
 * first one, had no way forward at all.
 *
 * It works off the session rather than an emailed address, so this can only
 * ever send to the account already signed in — there is no way to use it to
 * probe which addresses are registered, or to post mail at someone else.
 */
export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "resend-verification"), 3, 15 * 60_000);
  if (!limit.ok) {
    return fail("You've asked for a few of these. Try again in a few minutes.", 429);
  }

  const session = await getSession();
  if (!session) return fail("Sign in first.", 401);

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return fail("Sign in first.", 401);

  // Already done — say so plainly rather than sending a link that does nothing.
  if (user.emailVerified) return ok({ alreadyVerified: true });

  // Supersede any outstanding links so an old one can't be used later.
  await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendVerificationEmail(user.email, user.name, raw);

  return ok({ sent: true, email: user.email });
}
