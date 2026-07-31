import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, homeForRole } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = rateLimit(clientKey(req, "login"), 10, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again shortly.", 429);

  const parsed = await parseBody(req, loginSchema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    include: { creatorProfile: { select: { handle: true, status: true } } },
  });

  // Constant-ish response — never reveal whether the email exists.
  const generic = fail("Invalid email or password.", 401);
  if (!user) {
    // Still spend time hashing to reduce timing signal.
    await verifyPassword(parsed.data.password, "$2a$12$0000000000000000000000000000000000000000000000000000");
    return generic;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return generic;

  // Suspended creators can't sign in.
  if (user.creatorProfile?.status === "SUSPENDED") {
    return fail("This account has been suspended. Contact the Plugz team.", 403);
  }

  await createSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    handle: user.creatorProfile?.handle,
  });

  return ok({
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    creatorStatus: user.creatorProfile?.status ?? null,
    redirect: homeForRole(user.role),
  });
}
