import { db } from "@/lib/db";
import { keepChoosableCategories } from "@/lib/categories";
import { ok, fail, parseBody } from "@/lib/http";
import { shopperSignupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Shopper registration.
 *
 * Unlike a creator application there is nothing to review, so the account is
 * live the moment it is created and the session is issued here rather than
 * sending someone to the sign-in page to type the password they just chose.
 * The verification email still goes out, because it is what makes the address
 * worth having on a mailing list, but it gates nothing.
 */

const TERMS_VERSION = "2026-07-01";

/**
 * Where the sign-up came from, e.g. a creator's storefront. Narrowed to the
 * characters a handle or a page name can contain, because this is caller-
 * supplied text that the admin directory later displays.
 */
function cleanSource(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase().replace(/[^a-z0-9._@/-]/g, "").slice(0, 60);
  return value || null;
}

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "signup-shopper"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, shopperSignupSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  // A category the team has since removed should not be kept against an
  // account: it would be sent nothing and read as an interest they still hold.
  const interests = await keepChoosableCategories(input.interests);

  const email = input.email.toLowerCase();

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return fail("An account with this email already exists.", 409, {
      email: "This email is already registered",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const user = await db.user.create({
    data: {
      email,
      name: input.name,
      role: "SHOPPER",
      passwordHash,
      shopperProfile: {
        create: {
          city: input.city || null,
          interests,
          marketingOptIn: input.marketing,
          // Only stamped when they actually said yes, so the record can always
          // answer when consent was given and for which wording.
          marketingOptInAt: input.marketing ? now : null,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: now,
          signupSource: cleanSource(input.source),
        },
      },
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendVerificationEmail(email, user.name, raw);

  await createSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: false,
  });

  return ok({ email, redirect: "/account" }, 201);
}
