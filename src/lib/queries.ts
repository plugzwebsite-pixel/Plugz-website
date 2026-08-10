import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Read side of the public catalogue — everything the shopper-facing pages
 * render. Kept in one place so the visibility rule below can't drift between
 * the homepage, a storefront and search.
 */

/**
 * Who is allowed to appear publicly.
 *
 * Approved is not enough on its own. A creator added by an admin on their
 * behalf has to log in and release their own profile first (dual consent), so
 * an admin-added profile stays invisible until `profileReleasedAt` is set.
 * Self-serve applicants released their profile by applying.
 */
export const publiclyVisibleCreator = {
  status: "APPROVED",
  OR: [{ source: "SELF_SERVE" }, { profileReleasedAt: { not: null } }],
} satisfies Prisma.CreatorProfileWhereInput;

export type CreatorCardData = {
  name: string;
  handle: string;
  tag: string;
  category: string;
  followers: number;
  avatarUrl: string | null;
  trending: boolean;
};

export type ProductCardData = {
  name: string;
  slug: string;
  brand: string;
  pricePence: number | null;
  category: string;
  imageUrl: string | null;
  creatorHandle: string;
  clicks: number;
};

const creatorSelect = {
  handle: true,
  category: true,
  bio: true,
  avatarUrl: true,
  city: true,
  user: { select: { name: true } },
  socials: { select: { platform: true, handle: true, url: true, followers: true } },
} satisfies Prisma.CreatorProfileSelect;

const productSelect = {
  slug: true,
  profile: { select: { handle: true } },
  product: {
    select: {
      name: true,
      imageUrl: true,
      pricePence: true,
      category: true,
      brand: { select: { name: true } },
    },
  },
  trackingLink: { select: { clickCount: true } },
} satisfies Prisma.CreatorProductSelect;

type CreatorRow = Prisma.CreatorProfileGetPayload<{ select: typeof creatorSelect }>;
type ProductRow = Prisma.CreatorProductGetPayload<{ select: typeof productSelect }>;

function totalFollowers(socials: { followers: number }[]) {
  return socials.reduce((sum, s) => sum + s.followers, 0);
}

function toCreatorCard(row: CreatorRow, trending = false): CreatorCardData {
  return {
    name: row.user.name,
    handle: row.handle,
    tag: row.bio ?? row.city ?? row.category,
    category: row.category,
    followers: totalFollowers(row.socials),
    avatarUrl: row.avatarUrl,
    trending,
  };
}

function toProductCard(row: ProductRow): ProductCardData {
  return {
    name: row.product.name,
    slug: row.slug,
    brand: row.product.brand.name,
    pricePence: row.product.pricePence,
    category: row.product.category,
    imageUrl: row.product.imageUrl,
    creatorHandle: row.profile.handle,
    clicks: row.trackingLink?.clickCount ?? 0,
  };
}

const liveProduct = {
  live: true,
  profile: publiclyVisibleCreator,
} satisfies Prisma.CreatorProductWhereInput;

// --- creators ---------------------------------------------------------------

export async function getCreatorByHandle(handle: string) {
  const row = await db.creatorProfile.findFirst({
    where: { handle: handle.toLowerCase(), ...publiclyVisibleCreator },
    select: creatorSelect,
  });
  return row ? { ...toCreatorCard(row), socials: row.socials } : null;
}

/** Ordered by reach — the wall of faces that opens the homepage. */
export async function getFeaturedCreators(limit = 12): Promise<CreatorCardData[]> {
  const rows = await db.creatorProfile.findMany({
    where: publiclyVisibleCreator,
    select: creatorSelect,
    take: limit * 3,
  });
  return rows
    .map((r) => toCreatorCard(r))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map((c, i) => ({ ...c, trending: i < Math.ceil(limit / 2) }));
}

// --- products ---------------------------------------------------------------

/** Most-clicked first — what shoppers are actually going through to. */
export async function getTrendingProducts(limit = 8): Promise<ProductCardData[]> {
  const rows = await db.creatorProduct.findMany({
    where: liveProduct,
    select: productSelect,
    orderBy: [{ trackingLink: { clickCount: "desc" } }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getProductsForCreator(handle: string, limit = 24) {
  const rows = await db.creatorProduct.findMany({
    where: { ...liveProduct, profile: { ...publiclyVisibleCreator, handle } },
    select: productSelect,
    orderBy: [{ trackingLink: { clickCount: "desc" } }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

export async function getProductsByCategory(category: string, limit = 24) {
  const rows = await db.creatorProduct.findMany({
    where: { ...liveProduct, product: { category } },
    select: productSelect,
    orderBy: [{ trackingLink: { clickCount: "desc" } }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toProductCard);
}

/** The single product page: pluggz.com/@handle/<slug>. */
export async function getCreatorProduct(handle: string, slug: string) {
  const row = await db.creatorProduct.findFirst({
    where: {
      slug,
      live: true,
      profile: { handle: handle.toLowerCase(), ...publiclyVisibleCreator },
    },
    select: {
      id: true,
      slug: true,
      review: true,
      rating: true,
      videoUrl: true,
      profile: { select: creatorSelect },
      trackingLink: { select: { code: true, discountCode: true, clickCount: true } },
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          pricePence: true,
          currency: true,
          category: true,
          brand: { select: { name: true, slug: true, websiteUrl: true } },
        },
      },
    },
  });
  if (!row) return null;

  // Other creators who plugged the same product — the payoff of keeping one
  // master product record instead of duplicating it per creator.
  const alsoPluggedBy = await db.creatorProduct.findMany({
    where: {
      productId: row.product.id,
      id: { not: row.id },
      ...liveProduct,
    },
    select: {
      slug: true,
      rating: true,
      profile: { select: { handle: true, avatarUrl: true, user: { select: { name: true } } } },
    },
    take: 6,
  });

  return { ...row, creator: toCreatorCard(row.profile), alsoPluggedBy };
}

export async function getSimilarProducts(
  category: string,
  excludeSlug: string,
  limit = 4
) {
  const rows = await db.creatorProduct.findMany({
    where: {
      ...liveProduct,
      product: { category },
      NOT: { slug: excludeSlug },
    },
    select: productSelect,
    orderBy: { trackingLink: { clickCount: "desc" } },
    take: limit,
  });
  return rows.map(toProductCard);
}

// --- search -----------------------------------------------------------------

export async function searchCatalogue(query: string) {
  const q = query.trim();
  if (!q) return { creators: [], products: [] };

  const insensitive = Prisma.QueryMode.insensitive;

  const [creatorRows, productRows] = await Promise.all([
    db.creatorProfile.findMany({
      // AND, not a spread. `publiclyVisibleCreator` carries its own OR for the
      // dual-consent check, and spreading it alongside a second OR would let
      // the later key silently replace it — publishing creators who have not
      // released their profile yet.
      where: {
        AND: [
          publiclyVisibleCreator,
          {
            OR: [
              { handle: { contains: q, mode: insensitive } },
              { category: { contains: q, mode: insensitive } },
              { bio: { contains: q, mode: insensitive } },
              { city: { contains: q, mode: insensitive } },
              { user: { name: { contains: q, mode: insensitive } } },
            ],
          },
        ],
      },
      select: creatorSelect,
      take: 12,
    }),
    db.creatorProduct.findMany({
      where: {
        AND: [
          liveProduct,
          {
            OR: [
              { product: { name: { contains: q, mode: insensitive } } },
              { product: { category: { contains: q, mode: insensitive } } },
              { product: { brand: { name: { contains: q, mode: insensitive } } } },
              { profile: { handle: { contains: q, mode: insensitive } } },
            ],
          },
        ],
      },
      select: productSelect,
      take: 24,
    }),
  ]);

  return {
    creators: creatorRows.map((r) => toCreatorCard(r)),
    products: productRows.map(toProductCard),
  };
}

/**
 * Headline numbers on the homepage.
 *
 * These are counted from the database rather than written by hand. The site is
 * recruiting real creators, so a claim like "£2.4M shopped this month" cannot
 * sit on the page until there is £2.4M of verified sales behind it.
 */
export async function getPlatformStats() {
  const [creators, listings, brands, approved, clicks, ratings] =
    await Promise.all([
      db.creatorProfile.count({ where: publiclyVisibleCreator }),
      db.creatorProduct.count({ where: liveProduct }),
      db.brand.count({ where: { status: "ACTIVE" } }),
      db.sale.aggregate({
        where: { status: "APPROVED" },
        _sum: { valuePence: true, creatorAmountPence: true },
      }),
      db.trackingLink.aggregate({ _sum: { clickCount: true } }),
      db.creatorProduct.aggregate({
        where: { ...liveProduct, rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

  return {
    creators,
    listings,
    brands,
    salesPence: approved._sum.valuePence ?? 0,
    creatorCommissionPence: approved._sum.creatorAmountPence ?? 0,
    clicks: clicks._sum.clickCount ?? 0,
    averageRating: ratings._avg.rating,
  };
}

/** Category tiles on the homepage, with a real count of what's in each. */
export async function getCategoryCounts() {
  const grouped = await db.creatorProduct.groupBy({
    by: ["productId"],
    where: liveProduct,
  });
  if (grouped.length === 0) return new Map<string, number>();

  const products = await db.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { category: true },
  });
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return counts;
}

/**
 * The brand the homepage puts its "featured partner" panel behind.
 *
 * Read from the catalogue rather than written into the page. The panel used to
 * name a brand and quote a delivery offer in hard-coded copy, and when that
 * brand was deleted the homepage carried on advertising it — with a promotion
 * nobody had agreed to. Anything claimed here now has to be true of a brand
 * that actually exists, and the picture is one of its own product shots.
 */
export async function getFeaturedBrand() {
  // Lead with the standout piece in the catalogue rather than whichever brand
  // happens to have the most rows. "Featured partner" is a shop window: the
  // most-listings rule put a GBP24 hat there while a Mulberry bag sat further
  // down the page.
  //
  // The panel's whole pitch is the creator's review, so a listing that carries
  // one wins even over a more expensive piece that doesn't. Not every product
  // has been written up — the catalogue is loaded from the client's list well
  // before the creators get to it — and the panel must not send a shopper to
  // read a review that was never written.
  const select = {
    name: true,
    category: true,
    imageUrl: true,
    pricePence: true,
    brand: { select: { name: true, _count: { select: { products: true } } } },
  } satisfies Prisma.ProductSelect;

  const where = {
    imageUrl: { not: null },
    pricePence: { not: null },
    brand: { status: "ACTIVE" },
  } satisfies Prisma.ProductWhereInput;

  const reviewed = { ...liveProduct, review: { not: null } };

  const written = await db.product.findFirst({
    where: { ...where, creatorProducts: { some: reviewed } },
    select: {
      ...select,
      creatorProducts: {
        where: reviewed,
        select: { slug: true, profile: { select: { handle: true } } },
        take: 1,
      },
    },
    orderBy: { pricePence: "desc" },
  });

  const hero =
    written ??
    (await db.product.findFirst({
      where: { ...where, creatorProducts: { some: liveProduct } },
      select: {
        ...select,
        creatorProducts: {
          where: liveProduct,
          select: { slug: true, profile: { select: { handle: true } } },
          take: 1,
        },
      },
      orderBy: { pricePence: "desc" },
    }));

  const listing = hero?.creatorProducts[0];
  if (!hero || !listing) return null;

  return {
    brandName: hero.brand.name,
    productName: hero.name,
    category: hero.category,
    imageUrl: hero.imageUrl!,
    pricePence: hero.pricePence,
    productCount: hero.brand._count.products,
    href: `/@${listing.profile.handle}/${listing.slug}`,
    hasReview: hero === written,
  };
}
