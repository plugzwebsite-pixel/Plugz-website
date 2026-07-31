import "server-only";
import type { Role } from "@prisma/client";
import { getSession, type SessionUser } from "./session";

/**
 * Guard for API route handlers. Returns the session user, or a Response to
 * return early when unauthorised.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<
  { user: SessionUser } | { response: Response }
> {
  const user = await getSession();
  if (!user) {
    return {
      response: Response.json(
        { ok: false, message: "You must be signed in." },
        { status: 401 }
      ),
    };
  }
  if (roles.length && !roles.includes(user.role)) {
    return {
      response: Response.json(
        { ok: false, message: "You don't have access to this." },
        { status: 403 }
      ),
    };
  }
  return { user };
}
