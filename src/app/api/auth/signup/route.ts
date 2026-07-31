import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { creatorSignupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const TERMS_VERSION = "2026-07-01";

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "signup"), 6, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, creatorSignupSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const email = input.email.toLowerCase();

  const [emailTaken, handleTaken] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.creatorProfile.findUnique({
      where: { handle: input.handle },
      select: { id: true },
    }),
  ]);
  if (emailTaken)
    return fail("An account with this email already exists.", 409, {
      email: "This email is already registered",
    });
  if (handleTaken)
    return fail("That handle is already taken.", 409, {
      handle: "This handle is already taken",
    });

  const passwordHash = await hashPassword(input.password);
  const socials = input.socials
    .filter((s) => s.handle && s.handle.trim().length > 0)
    .map((s) => ({
      platform: s.platform,
      handle: s.handle!.replace(/^@/, ""),
      followers: s.followers ?? 0,
    }));

  const user = await db.user.create({
    data: {
      email,
      name: input.name,
      role: "CREATOR",
      passwordHash,
      creatorProfile: {
        create: {
          handle: input.handle,
          category: input.category,
          city: input.city || null,
          status: "PENDING",
          source: "SELF_SERVE",
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: new Date(),
          profileReleasedAt: new Date(),
          socials: { create: socials },
        },
      },
    },
  });

  const { raw, hash } = generateToken();
  await db.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendVerificationEmail(email, input.name, raw);

  return ok(
    { email, status: "PENDING" },
    201
  );
}
