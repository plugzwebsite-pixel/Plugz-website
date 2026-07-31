import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validation";
import { hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "reset"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, resetPasswordSchema);
  if (!parsed.success) return parsed.response;

  const tokenHash = hashToken(parsed.data.token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt)
    return fail("This reset link is invalid or has already been used.", 400);
  if (record.expiresAt < new Date())
    return fail("This reset link has expired. Request a new one.", 410);

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
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
