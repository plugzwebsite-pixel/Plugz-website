import { db } from "@/lib/db";
import { keepChoosableCategories } from "@/lib/categories";
import { ok, fail, parseBody } from "@/lib/http";
import { shopperProfileSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth/guard";
import { createSessionCookie, getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";

/** A shopper editing their own details and their mailing preference. */
export async function PATCH(req: Request) {
  const guard = await requireRole("SHOPPER");
  if ("response" in guard) return guard.response;

  const limit = await rateLimit(clientKey(req, "account"), 20, 60_000);
  if (!limit.ok) return fail("Too many changes at once. Try again shortly.", 429);

  const parsed = await parseBody(req, shopperProfileSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  // A category the team has since removed should not be kept against an
  // account: it would be sent nothing and read as an interest they still hold.
  const interests = await keepChoosableCategories(input.interests);

  const profile = await db.shopperProfile.findUnique({
    where: { userId: guard.user.id },
    select: { id: true, marketingOptIn: true },
  });
  if (!profile) return fail("Account not found.", 404);

  const now = new Date();
  // Only move the consent timestamps when the answer actually changes, so a
  // shopper saving their city doesn't rewrite the date their consent was
  // given, and that date is the evidence the opt-in rests on.
  const changed = profile.marketingOptIn !== input.marketing;

  await db.$transaction([
    db.user.update({
      where: { id: guard.user.id },
      data: { name: input.name },
    }),
    db.shopperProfile.update({
      where: { id: profile.id },
      data: {
        city: input.city || null,
        interests,
        marketingOptIn: input.marketing,
        ...(changed
          ? input.marketing
            ? { marketingOptInAt: now, marketingOptOutAt: null }
            : { marketingOptOutAt: now }
          : {}),
      },
    }),
  ]);

  // The name is baked into the session token and shown in the header, so it
  // has to be reissued or the old one follows them around for a week.
  const session = await getSession();
  if (session) await createSessionCookie({ ...session, name: input.name });

  return ok({ name: input.name, marketing: input.marketing });
}

/**
 * Deleting your own account.
 *
 * The password is asked again because deleting is the one action a stolen
 * session must not be able to take on its own. The user row goes and the
 * profile, saved items and follows cascade with it; the session is left for
 * the client to clear by calling the logout endpoint on success.
 */
const deleteSchema = z.object({
  password: z.string().min(1, "Enter your password"),
});

export async function DELETE(req: Request) {
  const limit = await rateLimit(clientKey(req, "account-delete"), 10, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const session = await getSession();
  if (!session) return fail("Sign in first.", 401);

  const parsed = await parseBody(req, deleteSchema);
  if (!parsed.success) return parsed.response;

  const account = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, passwordHash: true },
  });
  if (!account) return fail("Sign in first.", 401);

  const matches = await verifyPassword(parsed.data.password, account.passwordHash);
  if (!matches) return fail("That password isn't right.", 403);

  await db.user.delete({ where: { id: account.id } });

  return ok({ deleted: true });
}
