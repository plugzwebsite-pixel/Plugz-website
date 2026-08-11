import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * The demo shop's own backend.
 *
 * This is the brand's side of the integration, written out in full so it can be
 * pointed at during a demonstration: take the reference the shopper arrived
 * with, sign the body with the secret we issued, and post it to the public
 * endpoint. Twelve lines, and it is the entire ask.
 *
 * It signs only for the one fictional demo brand. It cannot be used to report
 * a sale against a real brand — the lookup is pinned to that slug.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_BRAND = "aurora-atelier";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "demo-order"), 20, 60_000);
  if (!limit.ok) return fail("Too many demo orders. Try again shortly.", 429);

  let body: { pz?: string | null; valuePence?: number };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const brand = await db.brand.findUnique({
    where: { slug: DEMO_BRAND },
    select: { trackingKey: true, trackingSecret: true },
  });
  if (!brand?.trackingKey || !brand.trackingSecret) {
    return fail("The demo brand has no tracking credentials.", 500);
  }

  const orderRef = `AA-${Date.now().toString(36).toUpperCase()}`;
  const value = Number.isInteger(body.valuePence) ? Number(body.valuePence) : 18500;

  // An order with no reference still completes — the shopper bought something.
  // It simply cannot be attributed, which is the point worth showing.
  if (!body.pz) return ok({ orderRef, attributed: false });

  const payload = JSON.stringify({
    pz: body.pz,
    orderRef,
    value,
    currency: "GBP",
  });
  const signature = createHmac("sha256", brand.trackingSecret).update(payload).digest("hex");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const res = await fetch(`${origin}/api/track/sale`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pluggz-key": brand.trackingKey,
      "x-pluggz-signature": signature,
    },
    body: payload,
  });
  const result = await res.json().catch(() => null);

  return ok({
    orderRef,
    attributed: res.ok,
    trackingStatus: res.status,
    trackingResponse: result,
  });
}
