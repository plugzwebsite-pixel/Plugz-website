import "server-only";
import type { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { clientIpFrom } from "@/lib/rate-limit";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token with Cloudflare's siteverify endpoint.
 *
 * Server only: the secret never leaves this module. The remote IP is sent
 * along when we have a real one, because Cloudflare weighs it when scoring
 * the challenge; "local" is our own placeholder and would only add noise.
 */
export async function verifyToken(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A network blip talking to Cloudflare should read as "not verified",
    // never as an exception the route has to catch.
    return false;
  }
}

/**
 * Pull the `turnstileToken` out of a request body without consuming it.
 *
 * Auth routes accept plain JSON, and creator sign-up additionally accepts
 * multipart with the JSON tucked into a `payload` part when a photo is
 * attached. Either way the token travels next to the validated fields, and
 * the route's own schema parsing strips it afterwards as an unknown key.
 */
async function extractToken(req: Request): Promise<string | undefined> {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const payload = form.get("payload");
      if (typeof payload !== "string") return undefined;
      const parsed = JSON.parse(payload) as { turnstileToken?: unknown };
      return typeof parsed.turnstileToken === "string"
        ? parsed.turnstileToken
        : undefined;
    }
    const json = (await req.json()) as { turnstileToken?: unknown };
    return typeof json?.turnstileToken === "string"
      ? json.turnstileToken
      : undefined;
  } catch {
    return undefined;
  }
}

export type TurnstileCheck = { ok: true } | { ok: false; response: NextResponse };

/**
 * Gate an auth route on a valid Turnstile token.
 *
 * Reads the body from a clone so the route can parse the original afterwards
 * exactly as before. With no secret configured the check is skipped in
 * development (with a warning, so it is noticed) and fails closed in
 * production: silently accepting sign-ins without the check would be worse
 * than a clear 503 telling the owner to set the key.
 */
export async function checkTurnstile(req: Request): Promise<TurnstileCheck> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        response: fail(
          "Verification is temporarily unavailable. Try again shortly.",
          503
        ),
      };
    }
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY is not set; skipping verification (development only)"
    );
    return { ok: true };
  }

  const token = await extractToken(req.clone());
  if (!token) {
    return {
      ok: false,
      response: fail("Verification failed. Please try again.", 400),
    };
  }

  const ip = clientIpFrom(req.headers);
  const valid = await verifyToken(token, ip === "local" ? undefined : ip);
  if (!valid) {
    return {
      ok: false,
      response: fail("Verification failed. Please try again.", 400),
    };
  }
  return { ok: true };
}
