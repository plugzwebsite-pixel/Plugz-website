import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { recordSale, SaleError } from "@/lib/sales";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * The endpoint a brand's own server calls when an order completes.
 *
 * This is the piece that turns reporting from a spreadsheet into something
 * automatic. We can never see a sale happen on someone else's website — no
 * affiliate platform can — so the brand has to tell us. This is how they do it
 * without a human involved.
 *
 * The contract is the one published in docs/brand-integration-guide.md and
 * already sent to brands, so it is fixed: key in a header, HMAC of the exact
 * body, and the click reference we handed them on the way out.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  pz?: string;
  orderRef?: string;
  value?: number;
  currency?: string;
  soldAt?: string;
  status?: string;
};

function reply(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Constant-time compare, so a wrong signature can't be found by timing it. */
function signatureMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "track-sale"), 600, 60_000);
  if (!limit.ok) return reply({ ok: false, error: "Slow down and retry." }, 429);

  const key = req.headers.get("x-pluggz-key");
  const signature = req.headers.get("x-pluggz-signature");
  if (!key || !signature) {
    return reply({ ok: false, error: "Missing key or signature." }, 401);
  }

  // The raw bytes, not a re-serialised object: the brand signed what they sent,
  // and JSON.stringify would not reproduce it byte for byte.
  const raw = await req.text();

  const brand = await db.brand.findUnique({
    where: { trackingKey: key },
    select: { id: true, name: true, trackingSecret: true, status: true },
  });
  if (!brand?.trackingSecret) {
    return reply({ ok: false, error: "Unknown key." }, 401);
  }
  if (brand.status !== "ACTIVE") {
    return reply({ ok: false, error: "This brand is not active." }, 403);
  }

  const expected = createHmac("sha256", brand.trackingSecret).update(raw).digest("hex");
  if (!signatureMatches(expected, signature.replace(/^sha256=/, ""))) {
    return reply({ ok: false, error: "Signature did not match." }, 401);
  }

  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return reply({ ok: false, error: "Body was not valid JSON." }, 400);
  }

  const pz = body.pz?.trim();
  const orderRef = body.orderRef?.trim();
  const value = Number(body.value);

  if (!pz) return reply({ ok: false, error: "pz is required." }, 400);
  if (!orderRef) return reply({ ok: false, error: "orderRef is required." }, 400);
  if (!Number.isInteger(value) || value <= 0) {
    return reply({ ok: false, error: "value must be a positive integer, in pence." }, 400);
  }

  // Which listing earned it. A reference we don't recognise is still worth a
  // clear answer — it usually means the brand dropped it somewhere in checkout.
  const click = await db.click.findUnique({
    where: { id: pz },
    select: {
      id: true,
      trackingLink: {
        select: {
          creatorProductId: true,
          creatorProduct: {
            select: { product: { select: { brandId: true } } },
          },
        },
      },
    },
  });
  if (!click) {
    return reply({ ok: false, error: "We could not match that pz to a click." }, 422);
  }

  // A brand may only report against its own products.
  if (click.trackingLink.creatorProduct.product.brandId !== brand.id) {
    return reply({ ok: false, error: "That reference belongs to another brand." }, 403);
  }

  const creatorProductId = click.trackingLink.creatorProductId;

  // Retries and double-firing checkouts are safe: the same order reference
  // against the same listing is recorded once.
  const already = await db.sale.findUnique({
    where: { creatorProductId_orderRef: { creatorProductId, orderRef } },
    select: { id: true, status: true },
  });
  if (already) {
    return reply(
      { ok: true, saleId: already.id, status: already.status.toLowerCase(), duplicate: true },
      200
    );
  }

  const soldAt =
    body.soldAt && !Number.isNaN(Date.parse(body.soldAt)) ? new Date(body.soldAt) : undefined;

  try {
    const sale = await recordSale({
      creatorProductId,
      valuePence: value,
      orderRef,
      soldAt,
      clickRef: click.id,
    });
    return reply({ ok: true, saleId: sale.id, status: "pending" }, 200);
  } catch (err) {
    if (err instanceof SaleError) return reply({ ok: false, error: err.message }, 400);
    console.error("[track/sale] failed:", err);
    return reply({ ok: false, error: "Could not record that sale." }, 500);
  }
}
