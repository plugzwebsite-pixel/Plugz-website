import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";

/**
 * Dashboard figures, all counted from the tracking engine.
 *
 * Nothing here is estimated or filled in. If a number isn't measured yet it is
 * returned as null so the page can say so, rather than showing a plausible
 * figure that isn't true.
 */

export type DailyPoint = { day: string; count: number };

/**
 * Clicks that belong to the real business.
 *
 * The demonstration shop is our own fixture and every click on it is ours, so
 * counting them inflates the figures the team reports. Every click number on
 * the admin screens uses this, which is what lets the headline total and the
 * per-product table add up to each other.
 *
 * That agreement is the whole point, so this has to match the filter on the
 * product clicks screen exactly, creator visibility included. It did not: this
 * dropped the demonstration shop but still counted listings belonging to a
 * suspended or unreleased creator, while the other screen dropped both. Two
 * screens, same platform, different totals the moment anybody is suspended.
 */
const realClick = {
  trackingLink: {
    creatorProduct: {
      profile: publiclyVisibleCreator,
      product: { brand: publicBrand },
    },
  },
} satisfies Prisma.ClickWhereInput;

/**
 * The same condition for raw SQL, which cannot take a Prisma where.
 *
 * Only for a query that joins nothing else. `dailyClicks` takes the whole
 * fragment from its caller, and the creator and brand dashboards already join
 * TrackingLink as `tl`, so adding this on top of theirs is a duplicate alias.
 */
const REAL_CLICK_SQL = Prisma.sql`
  JOIN "TrackingLink" tl ON tl.id = c."trackingLinkId"
  JOIN "CreatorProduct" cp ON cp.id = tl."creatorProductId"
  JOIN "Product" p ON p.id = cp."productId"
  JOIN "Brand" b ON b.id = p."brandId" AND b."demo" = false
  JOIN "CreatorProfile" pr ON pr.id = cp."profileId"
   AND pr."status" = 'APPROVED'
   AND (pr."source" = 'SELF_SERVE' OR pr."profileReleasedAt" IS NOT NULL)
`;

/** Clicks per day for the last `days` days, zero-filled so gaps show as gaps. */
async function dailyClicks(
  days: number,
  where?: Prisma.Sql
): Promise<DailyPoint[]> {
  const rows = await db.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', c."clickedAt") AS day, COUNT(*)::bigint AS count
    FROM "Click" c
    ${where ?? Prisma.empty}
    GROUP BY 1
    ORDER BY 1
  `;

  const byDay = new Map(
    rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)])
  );
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day: d, count: byDay.get(d) ?? 0 });
  }
  return out;
}

// --- creator ----------------------------------------------------------------

export async function creatorDashboard(profileId: string) {
  const [listings, liveCount, salesAgg, pipeline, clickSeries] = await Promise.all([
    db.trackingLink.aggregate({
      where: { creatorProduct: { profileId } },
      _sum: { clickCount: true },
    }),
    db.creatorProduct.count({ where: { profileId, live: true } }),
    db.sale.aggregate({
      where: { creatorProduct: { profileId }, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { valuePence: true, creatorAmountPence: true },
      _count: true,
    }),
    db.sale.groupBy({
      by: ["stage"],
      where: { creatorProduct: { profileId }, status: { not: "RETURNED" } },
      _sum: { creatorAmountPence: true },
    }),
    dailyClicks(
      14,
      Prisma.sql`JOIN "TrackingLink" tl ON tl.id = c."trackingLinkId"
                 JOIN "CreatorProduct" cp ON cp.id = tl."creatorProductId"
                 WHERE cp."profileId" = ${profileId}
                   AND c."clickedAt" >= now() - interval '14 days'`
    ),
  ]);

  const clicks = listings._sum.clickCount ?? 0;
  const salesCount = salesAgg._count;

  // Ranking is by clicks earned, the only performance signal every creator has
  // from day one, before any sales have cleared.
  //
  // Done in SQL rather than by loading every creator with every product and
  // summing in memory: that shape is fine at a dozen creators and collapses at
  // a few hundred, which is exactly the growth this platform is planning for.
  const ranking = await db.$queryRaw<{ rank: bigint; total: bigint }[]>`
    WITH totals AS (
      SELECT p.id,
             COALESCE(SUM(tl."clickCount"), 0) AS clicks
      FROM "CreatorProfile" p
      LEFT JOIN "CreatorProduct" cp ON cp."profileId" = p.id
      LEFT JOIN "TrackingLink"  tl ON tl."creatorProductId" = cp.id
      WHERE p.status = 'APPROVED'
        AND (p.source = 'SELF_SERVE' OR p."profileReleasedAt" IS NOT NULL)
      GROUP BY p.id
    ), ranked AS (
      SELECT id, RANK() OVER (ORDER BY clicks DESC) AS rank, COUNT(*) OVER () AS total
      FROM totals
    )
    SELECT rank, total FROM ranked WHERE id = ${profileId}
  `;
  const rank = Number(ranking[0]?.rank ?? 0);
  const rankOf = Number(ranking[0]?.total ?? 0);

  const stageTotal = (stage: string) =>
    Number(pipeline.find((p) => p.stage === stage)?._sum.creatorAmountPence ?? 0);

  return {
    clicks,
    liveProducts: liveCount,
    salesCount,
    salesValuePence: salesAgg._sum.valuePence ?? 0,
    commissionPence: salesAgg._sum.creatorAmountPence ?? 0,
    conversionRate: clicks > 0 ? (salesCount / clicks) * 100 : null,
    rank: rank > 0 ? rank : null,
    rankOf,
    pipeline: {
      pendingPence: stageTotal("PENDING"),
      verifiedPence: stageTotal("VERIFIED") + stageTotal("PAID_TO_PLUGGZ"),
      paidPence: stageTotal("PAID_TO_CREATOR"),
    },
    clickSeries,
    // Not measured yet: on-site storefront views. Deliberately null rather
    // than a stand-in number.
    views: null as number | null,
  };
}

export async function creatorRecentSales(profileId: string, take = 8) {
  return db.sale.findMany({
    where: { creatorProduct: { profileId } },
    orderBy: { soldAt: "desc" },
    take,
    select: {
      id: true,
      valuePence: true,
      creatorAmountPence: true,
      status: true,
      stage: true,
      soldAt: true,
      creatorProduct: {
        select: {
          product: {
            select: {
              name: true,
              imageUrl: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

// --- admin ------------------------------------------------------------------

export async function adminAnalytics() {
  const [clicks, uniqueVisitors, creators, listings, brands, series, salesAgg] =
    await Promise.all([
      db.click.count({ where: realClick }),
      db.click
        .groupBy({ by: ["sessionId"], where: realClick })
        .then((r) => r.length),
      db.creatorProfile.count({ where: publiclyVisibleCreator }),
      db.creatorProduct.count({
        where: { live: true, product: { brand: publicBrand } },
      }),
      db.brand.count({ where: { status: "ACTIVE", ...publicBrand } }),
      dailyClicks(
        14,
        Prisma.sql`${REAL_CLICK_SQL}
                   WHERE c."clickedAt" >= now() - interval '14 days'`
      ),
      db.sale.aggregate({
        where: { status: "APPROVED" },
        _sum: { valuePence: true, pluggzAmountPence: true },
        _count: true,
      }),
    ]);

  // A repeat visitor is one attribution session seen on more than one day.
  const repeat = await db.$queryRaw<{ repeat: bigint; total: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE days > 1)::bigint AS repeat,
      COUNT(*)::bigint                          AS total
    FROM (
      SELECT c."sessionId",
             COUNT(DISTINCT date_trunc('day', c."clickedAt")) AS days
      FROM "Click" c
      ${REAL_CLICK_SQL}
      GROUP BY c."sessionId"
    ) s
  `;
  const repeatTotal = Number(repeat[0]?.total ?? 0);
  const repeatRate =
    repeatTotal > 0 ? (Number(repeat[0].repeat) / repeatTotal) * 100 : null;

  return {
    clicks,
    uniqueVisitors,
    creators,
    listings,
    brands,
    repeatRate,
    salesCount: salesAgg._count,
    salesValuePence: salesAgg._sum.valuePence ?? 0,
    pluggzRevenuePence: salesAgg._sum.pluggzAmountPence ?? 0,
    series,
  };
}

/**
 * Aggregated and ordered in the database, returning only the rows the page
 * shows. The alternative (pulling every creator with every product and every
 * sale and reducing in memory) grows with the whole platform to render five
 * rows.
 */
export async function topCreators(take = 5) {
  return db.$queryRaw<
    {
      name: string;
      handle: string;
      avatarUrl: string | null;
      followers: bigint;
      clicks: bigint;
      salesPence: bigint;
    }[]
  >`
    SELECT u.name,
           p.handle,
           p."avatarUrl",
           COALESCE(f.followers, 0)   AS followers,
           COALESCE(t.clicks, 0)      AS clicks,
           COALESCE(t.sales, 0)       AS "salesPence"
    FROM "CreatorProfile" p
    JOIN "User" u ON u.id = p."userId"
    LEFT JOIN (
      SELECT "profileId", SUM(followers)::bigint AS followers
      FROM "SocialHandle" GROUP BY "profileId"
    ) f ON f."profileId" = p.id
    LEFT JOIN (
      -- The demonstration shop is ours, so its clicks and its one sale are
      -- ours too. Without these joins a creator is ranked partly on our own
      -- fixture, which is the fault that was already fixed in topProducts.
      SELECT cp."profileId",
             SUM(COALESCE(tl."clickCount", 0))::bigint AS clicks,
             SUM(COALESCE(s.value, 0))::bigint         AS sales
      FROM "CreatorProduct" cp
      JOIN "Product" pd ON pd.id = cp."productId"
      JOIN "Brand" br ON br.id = pd."brandId" AND br."demo" = false
      LEFT JOIN "TrackingLink" tl ON tl."creatorProductId" = cp.id
      LEFT JOIN (
        SELECT "creatorProductId", SUM("valuePence")::bigint AS value
        FROM "Sale" WHERE status = 'APPROVED'
        GROUP BY "creatorProductId"
      ) s ON s."creatorProductId" = cp.id
      GROUP BY cp."profileId"
    ) t ON t."profileId" = p.id
    WHERE p.status = 'APPROVED'
      AND (p.source = 'SELF_SERVE' OR p."profileReleasedAt" IS NOT NULL)
    ORDER BY "salesPence" DESC, clicks DESC
    LIMIT ${take}
  `.then((rows) =>
    rows.map((r) => ({
      name: r.name,
      handle: r.handle,
      avatarUrl: r.avatarUrl,
      followers: Number(r.followers),
      clicks: Number(r.clicks),
      salesPence: Number(r.salesPence),
    }))
  );
}

export async function topProducts(take = 5) {
  const rows = await db.creatorProduct.findMany({
    // The demonstration shop is ours, so its clicks are ours. Leaving them in
    // put a fictional brand in the admin team's top five.
    where: {
      live: true,
      profile: publiclyVisibleCreator,
      product: { brand: publicBrand },
    },
    orderBy: { trackingLink: { clickCount: "desc" } },
    take,
    select: {
      slug: true,
      profile: { select: { handle: true } },
      trackingLink: { select: { clickCount: true } },
      product: {
        select: {
          name: true,
          imageUrl: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    name: r.product.name,
    brand: r.product.brand.name,
    imageUrl: r.product.imageUrl,
    handle: r.profile.handle,
    slug: r.slug,
    clicks: r.trackingLink?.clickCount ?? 0,
  }));
}

// --- brand ------------------------------------------------------------------

/**
 * Everything the brand dashboard shows, for one brand.
 *
 * `brandId` always comes from the signed-in user's own record, never from a
 * parameter, and every query below is filtered by it. A brand seeing another
 * brand's revenue would be the worst possible failure on this platform, so
 * there is deliberately no code path here that takes a brand id from a caller.
 */
export async function brandDashboard(brandId: string) {
  const [clicks, sales, products, series, brand] = await Promise.all([
    db.trackingLink.aggregate({
      where: { creatorProduct: { product: { brandId } } },
      _sum: { clickCount: true },
    }),
    db.sale.groupBy({
      by: ["status"],
      where: { creatorProduct: { product: { brandId } } },
      _sum: { valuePence: true, pluggzAmountPence: true, creatorAmountPence: true },
      _count: true,
    }),
    db.creatorProduct.count({
      where: { live: true, product: { brandId }, profile: publiclyVisibleCreator },
    }),
    dailyClicks(
      14,
      Prisma.sql`JOIN "TrackingLink" tl ON tl.id = c."trackingLinkId"
                 JOIN "CreatorProduct" cp ON cp.id = tl."creatorProductId"
                 JOIN "Product" p ON p.id = cp."productId"
                 WHERE p."brandId" = ${brandId}
                   AND c."clickedAt" >= now() - interval '14 days'`
    ),
    db.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        commissionRate: true,
        returnWindowDays: true,
        settlementDays: true,
        trackingMethod: true,
        status: true,
      },
    }),
  ]);

  const byStatus = (s: string) => sales.find((x) => x.status === s);
  const approved = byStatus("APPROVED");
  const pending = byStatus("PENDING");
  const returned = byStatus("RETURNED");

  const clickTotal = clicks._sum.clickCount ?? 0;
  const approvedCount = approved?._count ?? 0;
  const approvedValue = Number(approved?._sum.valuePence ?? 0);
  const commissionOwed = Number(approved?._sum.pluggzAmountPence ?? 0) +
    Number(approved?._sum.creatorAmountPence ?? 0);

  return {
    brand,
    clicks: clickTotal,
    liveProducts: products,
    series,
    salesCount: approvedCount,
    salesValuePence: approvedValue,
    pendingCount: pending?._count ?? 0,
    pendingValuePence: Number(pending?._sum.valuePence ?? 0),
    returnedCount: returned?._count ?? 0,
    commissionPence: commissionOwed,
    conversionRate: clickTotal > 0 ? (approvedCount / clickTotal) * 100 : null,
    // What the brand actually kept, after commission.
    netRevenuePence: approvedValue - commissionOwed,
    // Return on the commission spent: revenue generated per pound of
    // commission. Only meaningful once there is commission to divide by.
    roi: commissionOwed > 0 ? approvedValue / commissionOwed : null,
  };
}

/** Which creators are driving this brand's sales. */
export async function brandTopCreators(brandId: string, take = 5) {
  const rows = await db.creatorProduct.findMany({
    where: { product: { brandId }, profile: publiclyVisibleCreator },
    select: {
      profile: {
        select: { handle: true, avatarUrl: true, user: { select: { name: true } } },
      },
      trackingLink: { select: { clickCount: true } },
      sales: { where: { status: "APPROVED" }, select: { valuePence: true } },
    },
  });

  const byCreator = new Map<
    string,
    { name: string; handle: string; avatarUrl: string | null; clicks: number; salesPence: number }
  >();
  for (const r of rows) {
    const key = r.profile.handle;
    const entry = byCreator.get(key) ?? {
      name: r.profile.user.name,
      handle: key,
      avatarUrl: r.profile.avatarUrl,
      clicks: 0,
      salesPence: 0,
    };
    entry.clicks += r.trackingLink?.clickCount ?? 0;
    entry.salesPence += r.sales.reduce((s, x) => s + x.valuePence, 0);
    byCreator.set(key, entry);
  }

  return [...byCreator.values()]
    .sort((a, b) => b.salesPence - a.salesPence || b.clicks - a.clicks)
    .slice(0, take);
}

/** This brand's products on Pluggz, and how each is performing. */
/**
 * A brand's own catalogue, whether or not anybody has plugged it yet.
 *
 * Separate from brandProducts, which lists creator storefront listings and so
 * shows nothing at all until a creator picks something up. Now that a brand can
 * add its own products, that would have meant adding one and being shown an
 * empty screen, which reads as the save having failed.
 *
 * This is the inventory view: what the brand has offered, and how far each item
 * has got.
 */
export async function brandCatalogue(brandId: string, take = 100) {
  const rows = await db.product.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      pricePence: true,
      category: true,
      sourceUrl: true,
      createdAt: true,
      creatorProducts: {
        // The same visibility rule the listings table below uses. Without it
        // this counted a suspended or unreleased creator's listing, so the
        // catalogue said a product had two creators while the table under it
        // showed one, on the same screen.
        where: { profile: publiclyVisibleCreator },
        select: {
          live: true,
          trackingLink: { select: { clickCount: true } },
          sales: { where: { status: "APPROVED" }, select: { valuePence: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    pricePence: r.pricePence,
    category: r.category,
    sourceUrl: r.sourceUrl,
    addedAt: r.createdAt,
    plugs: r.creatorProducts.filter((c) => c.live).length,
    clicks: r.creatorProducts.reduce((t, c) => t + (c.trackingLink?.clickCount ?? 0), 0),
    salesPence: r.creatorProducts.reduce(
      (t, c) => t + c.sales.reduce((x, s) => x + s.valuePence, 0),
      0
    ),
  }));
}

export async function brandProducts(brandId: string, take = 20) {
  const rows = await db.creatorProduct.findMany({
    where: { product: { brandId }, profile: publiclyVisibleCreator },
    orderBy: { trackingLink: { clickCount: "desc" } },
    take,
    select: {
      slug: true,
      live: true,
      profile: { select: { handle: true, user: { select: { name: true } } } },
      trackingLink: { select: { clickCount: true } },
      product: { select: { name: true, imageUrl: true, pricePence: true } },
      sales: { where: { status: "APPROVED" }, select: { valuePence: true } },
    },
  });
  return rows.map((r) => ({
    name: r.product.name,
    imageUrl: r.product.imageUrl,
    pricePence: r.product.pricePence,
    creator: r.profile.user.name,
    handle: r.profile.handle,
    slug: r.slug,
    live: r.live,
    clicks: r.trackingLink?.clickCount ?? 0,
    salesPence: r.sales.reduce((s, x) => s + x.valuePence, 0),
  }));
}

/** Settlement view: what this brand owes Pluggz and when. */
export async function brandInvoices(brandId: string, take = 20) {
  return db.sale.findMany({
    where: { creatorProduct: { product: { brandId } } },
    orderBy: { soldAt: "desc" },
    take,
    select: {
      id: true,
      orderRef: true,
      valuePence: true,
      creatorAmountPence: true,
      pluggzAmountPence: true,
      status: true,
      stage: true,
      soldAt: true,
      verifiesAt: true,
      creatorProduct: {
        select: {
          product: { select: { name: true } },
          profile: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
}

// --- payouts ----------------------------------------------------------------

export async function payoutPipeline() {
  const byStage = await db.sale.groupBy({
    by: ["stage"],
    where: { status: { in: ["PENDING", "APPROVED"] } },
    _sum: { valuePence: true, creatorAmountPence: true, pluggzAmountPence: true },
    _count: true,
  });

  const stage = (s: string) => byStage.find((b) => b.stage === s);

  return {
    pending: {
      valuePence: Number(stage("PENDING")?._sum.valuePence ?? 0),
      count: stage("PENDING")?._count ?? 0,
    },
    verified: {
      valuePence: Number(stage("VERIFIED")?._sum.valuePence ?? 0),
      count: stage("VERIFIED")?._count ?? 0,
    },
    paidToPluggz: {
      valuePence: Number(stage("PAID_TO_PLUGGZ")?._sum.pluggzAmountPence ?? 0),
      count: stage("PAID_TO_PLUGGZ")?._count ?? 0,
    },
    paidToCreators: {
      valuePence: Number(stage("PAID_TO_CREATOR")?._sum.creatorAmountPence ?? 0),
      count: stage("PAID_TO_CREATOR")?._count ?? 0,
    },
  };
}

export async function settlementRows(take = 20) {
  return db.sale.findMany({
    orderBy: { soldAt: "desc" },
    take,
    select: {
      id: true,
      valuePence: true,
      creatorAmountPence: true,
      status: true,
      stage: true,
      soldAt: true,
      verifiesAt: true,
      creatorProduct: {
        select: {
          profile: { select: { handle: true, user: { select: { name: true } } } },
          product: {
            select: {
              name: true,
              brand: { select: { name: true, returnWindowDays: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * The handful of sales just recorded, for the page that records them.
 *
 * The ledger proper is on Payouts; this exists so an import gives visible
 * confirmation on the spot rather than appearing to do nothing.
 */
export async function recentSales(take = 5) {
  const rows = await db.sale.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      orderRef: true,
      valuePence: true,
      creatorAmountPence: true,
      soldAt: true,
      source: true,
      creatorProduct: {
        select: {
          profile: { select: { handle: true } },
          product: { select: { brand: { select: { name: true } } } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    orderRef: r.orderRef,
    valuePence: r.valuePence,
    creatorAmountPence: r.creatorAmountPence,
    soldAt: r.soldAt,
    source: r.source,
    handle: r.creatorProduct.profile.handle,
    brand: r.creatorProduct.product.brand.name,
  }));
}
