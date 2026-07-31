import "server-only";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  signSession,
  verifySession,
  type SessionUser,
} from "./jwt";

export type { SessionUser } from "./jwt";
export { homeForRole } from "./jwt";

/** Read + verify the current session from the request cookies (server side). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function createSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
