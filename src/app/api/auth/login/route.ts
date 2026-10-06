import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, homeForRole } from "@/lib/auth/session";
import { rateLimit, checkRateLimit, clientKey } from "@/lib/rate-limit";
import { checkTurnstile } from "@/lib/turnstile";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "login"), 10, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const captcha = await checkTurnstile(req);
  if (!captcha.ok) return captcha.response;

  const parsed = await parseBody(req, loginSchema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.toLowerCase();

  // Per-account lockout: five failed attempts in fifteen minutes. Checked
  // before any credential work, so a targeted attack burns out instead of
  // grinding against the hash.
  const accountLimit = await checkRateLimit(
    `login-fail:${email}`,
    5,
    15 * 60_000
  );
  if (!accountLimit.ok) {
    return fail(
      "Too many failed attempts for this account. Try again in a few minutes.",
      429
    );
  }
  const user = await db.user.findUnique({
    where: { email },
    include: {
      creatorProfile: {
        select: {
          handle: true,
          status: true,
          source: true,
          profileReleasedAt: true,
        },
      },
    },
  });

  const generic = fail("Invalid email or password.", 401);

  // Both failure paths count, including unknown emails: not counting those
  // would let an attacker hammer the address list for free while real
  // accounts stay protected.
  async function recordFailedAttempt() {
    await rateLimit(`login-fail:${email}`, 5, 15 * 60_000);
  }

  if (!user) {
    // A real bcrypt hash of a value nobody knows. bcrypt bails out of a
    // malformed hash in about a millisecond, which would leave an unknown
    // email answering ~20x faster than a known one and hand an attacker a
    // clean way to enumerate who has an account. Comparing against a valid
    // hash burns the same ~270ms either way.
    await verifyPassword(
      parsed.data.password,
      "$2b$12$1JBUD.FZm0nHg/c97op.vOug0HqWQcrafNLgZNxi6IsBdFHXUF08S"
    );
    await recordFailedAttempt();
    return generic;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordFailedAttempt();
    return generic;
  }

  const profile = user.creatorProfile;

  // Suspended accounts get no session at all.
  if (profile?.status === "SUSPENDED") {
    return fail("This account has been suspended. Contact the Pluggz team.", 403);
  }

  await createSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    handle: profile?.handle,
  });

  return ok({
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    creatorStatus: profile?.status ?? null,
    redirect: landingFor(user, profile),
  });
}

/**
 * Where a successful sign-in actually lands. A creator who isn't approved,
 * hasn't confirmed their email, or hasn't released an admin-created profile
 * has no dashboard to show yet, and sending them straight to it would bounce.
 */
function landingFor(
  user: { role: string; emailVerified: Date | null },
  profile: {
    status: string;
    source: string;
    profileReleasedAt: Date | null;
  } | null
): string {
  if (user.role === "BRAND") return "/brand/dashboard";
  if (user.role !== "CREATOR" || !profile) return homeForRole(user.role as never);
  if (profile.status !== "APPROVED") return "/creator/status";
  if (profile.source === "ADMIN_ADDED" && !profile.profileReleasedAt) {
    return "/creator/release";
  }
  if (!user.emailVerified) return "/creator/status";
  return "/creator/dashboard";
}
