import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validation";
import { hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "reset"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, resetPasswordSchema);
  if (!parsed.success) return parsed.response;

  const tokenHash = hashToken(parsed.data.token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { emailVerified: true } } },
  });

  if (!record || record.usedAt)
    return fail("This reset link is invalid or has already been used.", 400);
  if (record.expiresAt < new Date())
    return fail("This reset link has expired. Request a new one.", 410);

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      // Using this link proves the person holds that mailbox, which is exactly
      // what a verification link proves and by exactly the same means: a single
      // use secret sent to the address and nowhere else. Not saying so left a
      // creator invited by an admin in a loop. They set their password from the
      // invite, accepted the terms, released their profile, and were then sent
      // to a page asking them to verify the address the invite had just arrived
      // at. Only overwritten when it is not already set, so a real verification
      // date is never moved.
      data: {
        passwordHash,
        ...(record.user.emailVerified ? {} : { emailVerified: new Date() }),
      },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding reset tokens.
    db.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  return ok({ reset: true });
}
