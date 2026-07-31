import { createHash, randomBytes } from "crypto";

/**
 * One-time tokens (email verification, password reset). We send the raw token
 * in the link and store only its SHA-256 hash, so a database leak can't be
 * used to verify accounts or reset passwords.
 */

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function expiryFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
