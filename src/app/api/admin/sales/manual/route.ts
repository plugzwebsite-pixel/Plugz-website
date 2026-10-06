import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { recordSale, SaleError, isDuplicateOrder } from "@/lib/sales";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { manualSaleSchema } from "@/lib/validation";

/**
 * Record a single sale by hand.
 *
 * The import route is for brand reports; this is for the one-off sale that
 * never appears in one. Attribution resolves through the same three routes the
 * importer uses, and the listing it lands on has to belong to the brand chosen
 * on the form, so a sale can never be filed against the wrong brand.
 *
 * The record is tagged source MANUAL, which is what the ledger reads as "a
 * person looked at this", and commission is snapshotted by the same engine as
 * every other sale.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "sales-manual"), 20, 60_000);
  if (!limit.ok) return fail("Too many entries. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, manualSaleSchema);
  if (!parsed.success) return parsed.response;
  const { brandId, attribution, valuePence, orderRef, soldAt } = parsed.data;

  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true },
  });
  if (!brand) return fail("That brand no longer exists.", 422);

  // Resolve the attribution to a listing, and refuse anything that belongs to
  // a different brand than the one on the form.
  let listingId: string | null = null;
  let clickRef: string | null = null;

  if (attribution.type === "click") {
    const click = await db.click.findUnique({
      where: { id: attribution.clickRef },
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
      return fail("No click found for that reference.", 422, {
        "attribution.clickRef": "No click found for that reference",
      });
    }
    if (click.trackingLink.creatorProduct.product.brandId !== brand.id) {
      return fail("That click belongs to a different brand.", 422, {
        "attribution.clickRef": "That click belongs to a different brand",
      });
    }
    listingId = click.trackingLink.creatorProductId;
    clickRef = click.id;
  } else if (attribution.type === "code") {
    const link = await db.trackingLink.findFirst({
      where: {
        discountCode: { equals: attribution.discountCode, mode: "insensitive" },
      },
      select: {
        creatorProductId: true,
        creatorProduct: {
          select: { product: { select: { brandId: true } } },
        },
      },
    });
    if (!link) {
      return fail("No listing uses that discount code.", 422, {
        "attribution.discountCode": "No listing uses that discount code",
      });
    }
    if (link.creatorProduct.product.brandId !== brand.id) {
      return fail("That code belongs to a different brand.", 422, {
        "attribution.discountCode": "That code belongs to a different brand",
      });
    }
    listingId = link.creatorProductId;
  } else {
    const listing = await db.creatorProduct.findUnique({
      where: { id: attribution.listingId },
      select: { id: true, product: { select: { brandId: true } } },
    });
    if (!listing) {
      return fail("That listing no longer exists.", 422, {
        "attribution.listingId": "That listing no longer exists",
      });
    }
    if (listing.product.brandId !== brand.id) {
      return fail("That listing belongs to a different brand.", 422, {
        "attribution.listingId": "That listing belongs to a different brand",
      });
    }
    listingId = listing.id;
  }

  if (!listingId) return fail("Couldn't resolve the attribution.", 422);

  try {
    const recorded = await recordSale({
      creatorProductId: listingId,
      valuePence,
      orderRef: orderRef?.trim() || null,
      soldAt,
      clickRef,
      source: "MANUAL",
    });

    const listing = await db.creatorProduct.findUnique({
      where: { id: listingId },
      select: {
        product: { select: { name: true } },
        profile: {
          select: {
            handle: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    return ok({
      id: recorded.id,
      valuePence: recorded.valuePence,
      creatorAmountPence: recorded.creatorAmountPence,
      pluggzAmountPence: recorded.pluggzAmountPence,
      verifiesAt: recorded.verifiesAt.toISOString(),
      brandName: brand.name,
      productName: listing?.product.name ?? "Unknown product",
      creatorHandle: listing?.profile.handle ?? "unknown",
      creatorName: listing?.profile.user.name ?? "Unknown creator",
      orderRef: orderRef?.trim() || null,
    });
  } catch (err) {
    if (isDuplicateOrder(err)) {
      return fail("A sale for this order is already recorded.", 409, {
        orderRef: "A sale for this order is already recorded",
      });
    }
    if (err instanceof SaleError) return fail(err.message, 422);
    throw err;
  }
}
