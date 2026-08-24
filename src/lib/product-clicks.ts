import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";

export const PER_PAGE = 50;

export const SORTS = {
  clicks: "Most clicked",
  recent: "Newest listing",
  name: "Product name",
} as const;

export type Sort = keyof typeof SORTS;

export const SHOW = {
  all: "Every listing",
  clicked: "Clicked at least once",
  unclicked: "No clicks yet",
} as const;

export type Show = keyof typeof SHOW;

export function parseSort(v: string | undefined): Sort {
  return v && v in SORTS ? (v as Sort) : "clicks";
}

export function parseShow(v: string | undefined): Show {
  return v && v in SHOW ? (v as Show) : "all";
}

/**
 * Everything a shopper could have clicked, and how often.
 *
 * A click belongs to a tracking link, and a link belongs to one creator's
 * listing of one product, so a listing is the unit here rather than a product:
 * the same dress plugged by three creators is three rows, which is what the
 * team needs in order to see whose link is working.
 *
 * The demonstration shop is left out throughout. It is our own fixture and its
 * clicks are ours, so counting them would overstate the business.
 */
function where({ query, brand, show }: { query: string; brand: string; show: Show }) {
  const insensitive = Prisma.QueryMode.insensitive;

  const clauses: Prisma.CreatorProductWhereInput[] = [
    { profile: publiclyVisibleCreator, product: { brand: publicBrand } },
  ];

  if (query) {
    clauses.push({
      OR: [
        { product: { name: { contains: query, mode: insensitive } } },
        { product: { brand: { name: { contains: query, mode: insensitive } } } },
        { profile: { handle: { contains: query, mode: insensitive } } },
        { profile: { user: { name: { contains: query, mode: insensitive } } } },
      ],
    });
  }
  if (brand) clauses.push({ product: { brandId: brand } });
  if (show === "clicked") clauses.push({ trackingLink: { clickCount: { gt: 0 } } });
  if (show === "unclicked") {
    clauses.push({
      OR: [{ trackingLink: { is: null } }, { trackingLink: { clickCount: 0 } }],
    });
  }

  return { AND: clauses } satisfies Prisma.CreatorProductWhereInput;
}

const orderBy: Record<Sort, Prisma.CreatorProductOrderByWithRelationInput[]> = {
  clicks: [{ trackingLink: { clickCount: "desc" } }, { createdAt: "desc" }],
  recent: [{ createdAt: "desc" }],
  name: [{ product: { name: "asc" } }],
};

export async function listProductClicks(opts: {
  query: string;
  brand: string;
  show: Show;
  sort: Sort;
  page: number;
  /** The export asks for one big page; the screen takes the default. */
  take?: number;
}) {
  const filter = where(opts);
  const take = opts.take ?? PER_PAGE;

  const [rows, total] = await Promise.all([
    db.creatorProduct.findMany({
      where: filter,
      orderBy: orderBy[opts.sort],
      skip: (opts.page - 1) * take,
      take,
      select: {
        id: true,
        slug: true,
        live: true,
        createdAt: true,
        profile: { select: { handle: true, user: { select: { name: true } } } },
        trackingLink: { select: { code: true, clickCount: true, discountCode: true } },
        product: {
          select: {
            name: true,
            imageUrl: true,
            category: true,
            sourceUrl: true,
            brand: { select: { name: true } },
          },
        },
        sales: { select: { valuePence: true, status: true } },
        _count: { select: { views: true } },
      },
    }),
    db.creatorProduct.count({ where: filter }),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      product: r.product.name,
      brand: r.product.brand.name,
      category: r.product.category,
      imageUrl: r.product.imageUrl,
      creator: r.profile.user.name,
      handle: r.profile.handle,
      slug: r.slug,
      live: r.live,
      code: r.trackingLink?.code ?? null,
      discountCode: r.trackingLink?.discountCode ?? null,
      clicks: r.trackingLink?.clickCount ?? 0,
      views: r._count.views,
      salesCount: r.sales.length,
      salesPence: r.sales.reduce((t, s) => t + s.valuePence, 0),
      destination: r.product.sourceUrl,
      addedAt: r.createdAt,
    })),
  };
}

/** The totals the table has to add up to, so the two can be checked against each other. */
export async function productClickStats() {
  const base = { profile: publiclyVisibleCreator, product: { brand: publicBrand } };

  const [listings, clicked, links, brands] = await Promise.all([
    db.creatorProduct.count({ where: base }),
    db.creatorProduct.count({
      where: { ...base, trackingLink: { clickCount: { gt: 0 } } },
    }),
    db.trackingLink.findMany({
      where: { creatorProduct: base },
      select: { clickCount: true },
    }),
    // The card says "with a live listing", so count those rather than every
    // active brand. Most brands in the catalogue have one, but not all.
    db.creatorProduct
      .findMany({
        where: base,
        select: { product: { select: { brandId: true } } },
      })
      .then((rows) => new Set(rows.map((r) => r.product.brandId)).size),
  ]);

  return {
    listings,
    clicked,
    unclicked: listings - clicked,
    clicks: links.reduce((t, l) => t + l.clickCount, 0),
    brands,
  };
}

/** Brands that actually have a listing, for the filter. */
export async function brandsWithListings() {
  const rows = await db.brand.findMany({
    where: {
      status: "ACTIVE",
      ...publicBrand,
      products: { some: { creatorProducts: { some: { profile: publiclyVisibleCreator } } } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return rows;
}

function cell(value: string): string {
  // Product names come off other people's websites, so a title beginning with
  // =, +, - or @ would be run as a formula the moment somebody opened the
  // export in Excel. An apostrophe in front is the standard guard: the sheet
  // shows the text and never evaluates it, and the apostrophe itself is not
  // displayed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export type ProductClickRow = Awaited<
  ReturnType<typeof listProductClicks>
>["rows"][number];

/** The same rows the table is showing, for Lisa to open in Excel. */
export function productClicksToCsv(
  rows: ProductClickRow[],
  origin: string
): string {
  const header = [
    "Product",
    "Brand",
    "Category",
    "Creator",
    "Handle",
    "Clicks",
    "Sales",
    "Sales value (GBP)",
    "Status",
    "Discount code",
    "Tracking link",
    "Pluggz page",
    "Brand destination",
    "Added",
  ];

  const body = rows.map((r) =>
    [
      r.product,
      r.brand,
      r.category,
      r.creator,
      "@" + r.handle,
      String(r.clicks),
      String(r.salesCount),
      (r.salesPence / 100).toFixed(2),
      r.live ? "Live" : "Paused",
      r.discountCode ?? "",
      r.code ? `${origin}/go/${r.code}` : "",
      `${origin}/@${r.handle}/${r.slug}`,
      r.destination ?? "",
      r.addedAt.toISOString().slice(0, 10),
    ].map(cell)
  );

  // CRLF and a byte-order mark, so Excel opens it as UTF-8 rather than
  // mangling the accented brand names into mojibake.
  const BOM = "﻿";
  const lines = [header.map(cell), ...body].map((r) => r.join(","));
  return BOM + lines.join("\r\n");
}
