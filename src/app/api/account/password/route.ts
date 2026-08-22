import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Changing your own password while signed in.
 *
 * Every role, not just brands: a creator, a shopper and an administrator all
 * have exactly the same need, and three copies of this would drift apart. Until
 * now the only way to change a password at all was to sign out and use the
 * forgotten-password link, which is a strange thing to ask of somebody who is
 * already signed in and knows what their password is.
 *
 * The current password is required. Without it, anybody who found an unlocked
 * screen could take the account over permanently in two clicks.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Low, because this is a place where a wrong password can be guessed at.
  const limit = await rateLimit(clientKey(req, "change-password"), 10, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const user = await getSession();
  if (!user) return fail("Sign in first.", 401);

  const parsed = await parseBody(req, changePasswordSchema);
  if (!parsed.success) return parsed.response;

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!account?.passwordHash) return fail("Sign in first.", 401);

  const matches = await verifyPassword(parsed.data.current, account.passwordHash);
  if (!matches) {
    return fail("That is not your current password.", 403, {
      current: "That is not your current password",
    });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  // Any outstanding reset links are burnt off. Someone changing their password
  // because they think it is known is not helped by a reset email from last
  // week still working.
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  return ok({ changed: true });
}
