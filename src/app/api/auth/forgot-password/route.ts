import { db } from "@/lib/db";
import { ok, parseBody, fail } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "forgot"), 5, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, forgotPasswordSchema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  // Only actually send if the account exists — but always return success so we
  // never disclose which emails are registered.
  if (user) {
    const { raw, hash } = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(1) },
    });
    await sendPasswordResetEmail(email, user.name, raw);
  }

  return ok({ sent: true });
}
