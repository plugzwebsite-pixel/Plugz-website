import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Stands in for a brand's own server during the walkthrough.
 *
 * The only pretend part of the demo. Everything it does here is what a real
 * brand's checkout would do at the moment an order is confirmed: take the
 * reference we handed them, sign the body with their secret, and post it to the
 * public tracking endpoint. It deliberately calls that endpoint over HTTP
 * rather than shortcutting to the database, so the demo exercises the same
 * path a real brand would.
 *
 * Admin only. It can issue a signature, so it must never be reachable by
 * anyone who could use it to invent sales.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "demo-checkout"), 30, 60_000);
  if (!limit.ok) return fail("Slow down a moment.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  let body: { pz?: string; value?: number; orderRef?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const pz = body.pz?.trim();
  const value = Number(body.value);
  if (!pz) return fail("No click reference.", 400);
  if (!Number.isInteger(value) || value <= 0) return fail("Bad order value.", 400);

  // Look up the brand the way the brand itself would already know it.
  const click = await db.click.findUnique({
    where: { id: pz },
    select: {
      trackingLink: {
        select: {
          creatorProduct: {
            select: {
              product: {
                select: {
                  brand: { select: { name: true, trackingKey: true, trackingSecret: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const brand = click?.trackingLink.creatorProduct.product.brand;
  if (!brand?.trackingKey || !brand.trackingSecret) {
    return fail(
      "This brand has no tracking credentials yet — issue them from Admin → Brands first.",
      400
    );
  }

  const payload = JSON.stringify({
    pz,
    orderRef: body.orderRef?.trim() || `DEMO-${Date.now().toString(36).toUpperCase()}`,
    value,
    currency: "GBP",
  });
  const signature = createHmac("sha256", brand.trackingSecret).update(payload).digest("hex");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const started = Date.now();
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
    brand: brand.name,
    sent: JSON.parse(payload),
    signature: signature.slice(0, 32) + "…",
    status: res.status,
    response: result,
    tookMs: Date.now() - started,
  });
}
