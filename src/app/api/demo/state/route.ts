import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";

/**
 * Everything the walkthrough needs: a live listing to demonstrate with, and
 * whatever it has earned so far.
 *
 * Read straight from the same tables the creator and brand dashboards use, so
 * what the demo shows is what they will see.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  // Prefer a listing whose brand already has credentials, so the walkthrough
  // runs without setup.
  const listing =
    (await db.creatorProduct.findFirst({
      where: {
        live: true,
        trackingLink: { isNot: null },
        product: { brand: { trackingKey: { not: null } } },
      },
      select: pick(),
      orderBy: { createdAt: "asc" },
    })) ??
    (await db.creatorProduct.findFirst({
      where: { live: true, trackingLink: { isNot: null } },
      select: pick(),
      orderBy: { createdAt: "asc" },
    }));

  if (!listing?.trackingLink) return fail("No live listing to demonstrate with.", 404);

  const sales = await db.sale.findMany({
    where: { creatorProductId: listing.id },
    select: {
      id: true,
      orderRef: true,
      valuePence: true,
      creatorAmountPence: true,
      pluggzAmountPence: true,
      creatorRate: true,
      pluggzRate: true,
      status: true,
      stage: true,
      soldAt: true,
      verifiesAt: true,
      clickId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return ok({
    creator: {
      handle: listing.profile.handle,
      name: listing.profile.user.name,
      avatarUrl: listing.profile.avatarUrl,
    },
    product: {
      name: listing.product.name,
      imageUrl: listing.product.imageUrl,
      pricePence: listing.product.pricePence,
      brand: listing.product.brand.name,
      hasCredentials: Boolean(listing.product.brand.trackingKey),
      commissionRate: Number(listing.product.brand.commissionRate),
      returnWindowDays: listing.product.brand.returnWindowDays,
    },
    link: {
      code: listing.trackingLink.code,
      clickCount: listing.trackingLink.clickCount,
      destinationUrl: listing.trackingLink.destinationUrl,
    },
    path: `/@${listing.profile.handle}/${listing.slug}`,
    sales: sales.map((s) => ({
      ...s,
      creatorRate: Number(s.creatorRate),
      pluggzRate: Number(s.pluggzRate),
    })),
  });
}

function pick() {
  return {
    id: true,
    slug: true,
    profile: {
      select: { handle: true, avatarUrl: true, user: { select: { name: true } } },
    },
    product: {
      select: {
        name: true,
        imageUrl: true,
        pricePence: true,
        brand: {
          select: {
            name: true,
            trackingKey: true,
            commissionRate: true,
            returnWindowDays: true,
          },
        },
      },
    },
    trackingLink: { select: { code: true, clickCount: true, destinationUrl: true } },
  } as const;
}

/** Clear the sales this walkthrough created, so it can be run again cleanly. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const removed = await db.sale.deleteMany({ where: { orderRef: { startsWith: "DEMO-" } } });
  return ok({ removed: removed.count });
}
