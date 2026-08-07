import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "./session";

/**
 * Guard for API route handlers. Returns the session user, or a Response to
 * return early when unauthorised.
 *
 * The role is re-read from the database rather than trusted from the token.
 * Sessions last a week, so a token alone would keep an admin who has since been
 * demoted — or a creator who has since been suspended — working for days. The
 * page layouts already check this way; the API has to match, or it becomes the
 * weaker door into the same rooms.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<{ user: SessionUser } | { response: Response }> {
  const session = await getSession();
  if (!session) {
    return {
      response: Response.json(
        { ok: false, message: "You must be signed in." },
        { status: 401 }
      ),
    };
  }

  const account = await db.user.findUnique({
    where: { id: session.id },
    select: {
      role: true,
      creatorProfile: { select: { status: true } },
    },
  });

  // The token references an account that no longer exists.
  if (!account) {
    return {
      response: Response.json(
        { ok: false, message: "You must be signed in." },
        { status: 401 }
      ),
    };
  }

  if (account.creatorProfile?.status === "SUSPENDED") {
    return {
      response: Response.json(
        { ok: false, message: "This account has been suspended." },
        { status: 403 }
      ),
    };
  }

  if (roles.length && !roles.includes(account.role)) {
    return {
      response: Response.json(
        { ok: false, message: "You don't have access to this." },
        { status: 403 }
      ),
    };
  }

  // Hand back the live role, not the one baked into the token.
  return { user: { ...session, role: account.role } };
}
