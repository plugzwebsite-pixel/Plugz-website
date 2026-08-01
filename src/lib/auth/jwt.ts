import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

// Pure JWT + role helpers with NO server-only / next-headers imports, so this
// module is safe to use from the Edge middleware as well as the Node runtime.

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  handle?: string;
};

export const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "pluggz_session";
export const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? "7");
export const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secret());
}

export async function verifySession(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
      emailVerified: Boolean(payload.emailVerified),
      handle: payload.handle ? String(payload.handle) : undefined,
    };
  } catch {
    return null;
  }
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/approvals";
    case "CREATOR":
      return "/creator/dashboard";
    default:
      return "/";
  }
}
