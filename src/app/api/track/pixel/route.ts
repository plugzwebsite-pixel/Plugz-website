import { db } from "@/lib/db";
import { recordSale, SaleError, isDuplicateOrder } from "@/lib/sales";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * The endpoint a Shopify custom pixel calls when an order completes.
 *
 * The signed postback at /api/track/sale is the route we would always rather a
 * brand took, and nothing here replaces it. This exists because a great many
 * shops cannot put code on their own server: the store owner has a Shopify
 * login and nothing else, and telling them to hire a developer means the sale
 * never gets reported at all. A pixel they can paste into an admin screen in
 * five minutes reports something, and something is worth more than a
 * spreadsheet arriving three weeks later.
 *
 * What it cannot do is prove anything. The code runs in the shopper's browser,
 * so the key inside it is public, the order value is whatever the page decided
 * to send, and both are editable by anyone who opens dev tools. So this route
 * deliberately does not pretend:
 *
 *   - every sale is written with source PIXEL, and the admin screens show that
 *   - the pz must be a click we actually issued, which is the one thing a
 *     forger cannot invent, and it must belong to the brand whose key was used
 *   - the value is capped, so a mistake or a prank cannot book a six figure
 *     commission
 *   - it is rate limited by address and by key
 *
 * None of that makes a pixel sale trustworthy. It makes it traceable, and
 * bounded, and clearly labelled as needing reconciliation before payout.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  key?: string;
  pz?: string;
  orderRef?: string;
  value?: number | string;
  currency?: string;
  soldAt?: string;
};

/**
 * A pixel posts from the brand's own domain, so every response needs to say
 * cross-origin calls are allowed or the browser hides it from the script.
 *
 * The origin is open deliberately. A brand's shop can sit on any domain, on
 * several at once, and on ones we were never told about, so a list would break
 * quietly the first time somebody added a country domain. Nothing is lost by
 * it: no cookies or credentials are involved, so an allowed origin grants a
 * caller nothing they could not get from a plain server-side request anyway.
 * The security of this route is the pz check, never the browser's.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function reply(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
  });
}

/**
 * The preflight. Sending JSON from a page is not a simple request, so the
 * browser asks permission before it will send the real one. Without this the
 * pixel fails before our code ever runs, and it fails invisibly.
 */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * One million pence, so twenty thousand pounds.
 *
 * Comfortably above any order these shops will take and far below a number
 * that could do real damage if it were invented. A genuine order above this is
 * rare enough to be worth a human looking at it, and the brand can always
 * report it properly through the signed postback.
 */
const MAX_VALUE_PENCE = 2_000_000;

export async function POST(req: Request) {
  // Tighter than the signed route, and for the obvious reason: anyone at all
  // can call this one.
  const byAddress = await rateLimit(clientKey(req, "track-pixel"), 60, 60_000);
  if (!byAddress.ok) return reply({ ok: false, error: "Slow down and retry." }, 429);

  let body: Payload;
  try {
    const parsed: unknown = await req.json();
    // Valid JSON is not the same as a usable body. `null` parses perfectly and
    // then throws on the first property read, which turned a malformed request
    // into a 500 rather than the 400 it deserves.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return reply({ ok: false, error: "Body must be a JSON object." }, 400);
    }
    body = parsed as Payload;
  } catch {
    return reply({ ok: false, error: "Body was not valid JSON." }, 400);
  }

  const key = body.key?.trim();
  const pz = body.pz?.trim();
  const orderRef = body.orderRef?.trim();
  const value = Number(body.value);

  if (!key) return reply({ ok: false, error: "key is required." }, 400);
  if (!pz) return reply({ ok: false, error: "pz is required." }, 400);
  if (!orderRef) return reply({ ok: false, error: "orderRef is required." }, 400);
  if (!Number.isInteger(value) || value <= 0) {
    return reply({ ok: false, error: "value must be a positive integer, in pence." }, 400);
  }
  if (value > MAX_VALUE_PENCE) {
    return reply(
      { ok: false, error: "That value is too large to accept from a pixel." },
      422
    );
  }

  const brand = await db.brand.findUnique({
    where: { trackingKey: key },
    select: { id: true, status: true },
  });
  if (!brand) return reply({ ok: false, error: "Unknown key." }, 401);
  if (brand.status !== "ACTIVE") {
    return reply({ ok: false, error: "This brand is not active." }, 403);
  }

  // A second limit, per brand rather than per address, so one shop being
  // hammered from many addresses cannot fill the table.
  const byKey = await rateLimit(`track-pixel-brand:${brand.id}`, 600, 60_000);
  if (!byKey.ok) return reply({ ok: false, error: "Slow down and retry." }, 429);

  // The one claim in the whole request that cannot be fabricated. A pz is a
  // click id we issued, so a forger would have to click a real Pluggz link to
  // get one, and it would still have to be a link for this brand's product.
  const click = await db.click.findUnique({
    where: { id: pz },
    select: {
      id: true,
      trackingLink: {
        select: {
          creatorProductId: true,
          creatorProduct: { select: { product: { select: { brandId: true } } } },
        },
      },
    },
  });
  if (!click) {
    return reply({ ok: false, error: "We could not match that pz to a click." }, 422);
  }
  if (click.trackingLink.creatorProduct.product.brandId !== brand.id) {
    return reply({ ok: false, error: "That reference belongs to another brand." }, 403);
  }

  const creatorProductId = click.trackingLink.creatorProductId;

  // A pixel is far more likely to fire twice than a server is: a shopper
  // refreshing the thank you page, or coming back to it later, runs the whole
  // subscription again. Same order, same listing, recorded once.
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

  // A date from an unsigned caller decides the return window and therefore when
  // the sale becomes payable, so it cannot be taken on trust. Anyone holding a
  // brand's key, which is public by design because it sits in browser code, and
  // one genuine click could otherwise backdate a sale into a shorter window and
  // have it clear early. A date more than a day ahead or a week behind is not a
  // checkout time, so those fall back to now.
  let soldAt: Date | undefined;
  if (body.soldAt && !Number.isNaN(Date.parse(body.soldAt))) {
    const claimed = new Date(body.soldAt);
    const now = Date.now();
    const withinReason =
      claimed.getTime() <= now + 24 * 60 * 60 * 1000 &&
      claimed.getTime() >= now - 7 * 24 * 60 * 60 * 1000;
    if (withinReason) soldAt = claimed;
  }

  try {
    const sale = await recordSale({
      creatorProductId,
      valuePence: value,
      orderRef,
      soldAt,
      clickRef: click.id,
      source: "PIXEL",
    });
    // `unverified` is in the response so the brand's own developer can see, from
    // the first test they run, that this route is not the trusted one.
    return reply({ ok: true, saleId: sale.id, status: "pending", unverified: true }, 200);
  } catch (err) {
    if (err instanceof SaleError) return reply({ ok: false, error: err.message }, 400);

    // The duplicate check above is a look followed by a write, and two calls
    // for the same order can pass the look together. A thank-you page that
    // fires twice does exactly that. The database still refuses the second one,
    // so treat that refusal as what it is rather than reporting a fault.
    if (isDuplicateOrder(err)) {
      const existing = await db.sale.findUnique({
        where: { creatorProductId_orderRef: { creatorProductId, orderRef } },
        select: { id: true, status: true },
      });
      if (existing) {
        return reply(
          { ok: true, saleId: existing.id, status: existing.status.toLowerCase(), duplicate: true },
          200
        );
      }
    }

    console.error("[track/pixel] failed:", err);
    return reply({ ok: false, error: "Could not record that sale." }, 500);
  }
}
