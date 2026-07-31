import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { adminAddCreatorSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, expiryFromNow } from "@/lib/auth/tokens";
import { randomBytes } from "crypto";
import { sendCreatorInviteEmail } from "@/lib/email";

const TERMS_VERSION = "2026-07-01";

// Admin adds a creator on their behalf (dual-consent). The creator receives an
// invite to set a password and release their profile before it goes live.
export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("response" in auth) return auth.response;

  const parsed = await parseBody(req, adminAddCreatorSchema);
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

  // Random placeholder password — the creator sets their own via the invite.
  const tempHash = await hashPassword(randomBytes(24).toString("base64url"));
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
      passwordHash: tempHash,
      creatorProfile: {
        create: {
          handle: input.handle,
          category: input.category,
          city: input.city || null,
          status: "APPROVED", // admin trusts them; not live until released
          source: "ADMIN_ADDED",
          profileReleasedAt: null,
          termsVersion: TERMS_VERSION,
          socials: { create: socials },
        },
      },
    },
  });

  const { raw, hash } = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: expiryFromNow(24) },
  });
  await sendCreatorInviteEmail(email, input.name, raw);

  return ok({ id: user.id, invited: true }, 201);
}
