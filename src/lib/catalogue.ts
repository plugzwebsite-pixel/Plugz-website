import "server-only";
import { db } from "@/lib/db";
import { allocateCode } from "@/lib/tracking";

/**
 * Catalogue writes: brands, the master product record, and a creator's own
 * page for a product.
 *
 * The deduplication rule matters more than it looks. A product is keyed on its
 * canonical brand URL, so when a second creator plugs the same item we attach
 * their review to the existing record instead of creating a near-duplicate.
 * Without this the catalogue fills up with the same product many times over.
 */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Strip tracking noise so the same product always yields the same key. */
export function canonicalUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  const junk = /^(utm_|fbclid|gclid|mc_|ref$|source$|_branch)/i;
  for (const key of [...url.searchParams.keys()]) {
    if (junk.test(key)) url.searchParams.delete(key);
  }
  url.protocol = "https:";
  url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  return url.toString().replace(/\/$/, "");
}

// Public suffixes we strip before guessing a brand name. Taking the first
// label would turn shop.brandname.com into "Shop"; the registrable label is
// the one that actually names the brand.
const SUFFIXES = new Set([
  "com", "net", "org", "co", "uk", "io", "shop", "store", "eu", "us",
  "de", "fr", "es", "it", "ie", "nl", "au", "nz", "ca", "me", "biz", "info",
]);

export function brandNameFromUrl(raw: string): string {
  const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  const labels = host.split(".").filter((l) => !SUFFIXES.has(l));
  const base = labels[labels.length - 1] ?? host.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * `siteName` is the brand's own og:site_name where they publish one — always a
 * better name than anything we can infer from the hostname.
 */
export async function findOrCreateBrand(sourceUrl: string, siteName?: string | null) {
  const name = siteName?.trim() || brandNameFromUrl(sourceUrl);
  const slug = slugify(name);
  const websiteUrl = new URL(sourceUrl).origin;
  const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();

  // Match the host before the name. A brand onboarded by hand carries agreed
  // terms and its tracking key, and the name typed on the form rarely matches
  // what a hostname or an og:site_name produces — matching on name alone would
  // quietly create a second, DRAFT copy with no key, attach the product to it,
  // and leave every postback failing with "Unknown key".
  const hostMatch = {
    OR: [
      { websiteUrl: { contains: `//${host}`, mode: "insensitive" as const } },
      { websiteUrl: { contains: `//www.${host}`, mode: "insensitive" as const } },
    ],
  };
  // A brand somebody set up by hand wins over one auto-created from a paste,
  // whatever order the enum happens to be declared in.
  const byHost =
    (await db.brand.findFirst({ where: { ...hostMatch, status: "ACTIVE" } })) ??
    (await db.brand.findFirst({ where: hostMatch }));
  if (byHost) return byHost;

  const existing = await db.brand.findUnique({ where: { slug } });
  if (existing) return existing;

  return db.brand.create({
    // A brand auto-created from a pasted link starts as DRAFT — Lisa or Rachel
    // still has to work through the onboarding checklist and agree terms
    // before it counts as a live commercial relationship.
    data: { name, slug, websiteUrl, status: "DRAFT" },
  });
}

type ProductInput = {
  brandId: string;
  name: string;
  sourceUrl: string;
  description?: string | null;
  imageUrl?: string | null;
  pricePence?: number | null;
  currency?: string;
  category: string;
};

export async function findOrCreateProduct(input: ProductInput) {
  const sourceUrl = canonicalUrl(input.sourceUrl);
  const existing = await db.product.findUnique({ where: { sourceUrl } });
  if (existing) return existing;

  const slug = await uniqueProductSlug(input.brandId, slugify(input.name));
  return db.product.create({
    data: {
      brandId: input.brandId,
      name: input.name,
      slug,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      pricePence: input.pricePence ?? null,
      currency: input.currency ?? "GBP",
      category: input.category,
      sourceUrl,
    },
  });
}

async function uniqueProductSlug(brandId: string, base: string) {
  const slug = base || "product";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const clash = await db.product.findUnique({
      where: { brandId_slug: { brandId, slug: candidate } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

async function uniqueCreatorProductSlug(profileId: string, base: string) {
  const slug = base || "product";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const clash = await db.creatorProduct.findUnique({
      where: { profileId_slug: { profileId, slug: candidate } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

/**
 * Attach a product to a creator's storefront and mint its tracking link.
 *
 * `destinationUrl` defaults to the brand's own product URL, flagged as a
 * placeholder. That is the launch reality: creators can publish links today
 * and the real affiliate destination gets swapped in later without the
 * published link ever changing.
 */
export async function addProductToCreator(opts: {
  profileId: string;
  productId: string;
  productName: string;
  destinationUrl: string;
  isPlaceholder?: boolean;
  review?: string | null;
  rating?: number | null;
  collectionId?: string | null;
  discountCode?: string | null;
}) {
  const existing = await db.creatorProduct.findUnique({
    where: {
      profileId_productId: {
        profileId: opts.profileId,
        productId: opts.productId,
      },
    },
    include: { trackingLink: true },
  });
  if (existing) return existing;

  const slug = await uniqueCreatorProductSlug(
    opts.profileId,
    slugify(opts.productName)
  );
  const code = await allocateCode();

  return db.creatorProduct.create({
    data: {
      profileId: opts.profileId,
      productId: opts.productId,
      slug,
      review: opts.review ?? null,
      rating: opts.rating ?? null,
      collectionId: opts.collectionId ?? null,
      trackingLink: {
        create: {
          code,
          destinationUrl: opts.destinationUrl,
          isPlaceholder: opts.isPlaceholder ?? true,
          discountCode: opts.discountCode ?? null,
        },
      },
    },
    include: { trackingLink: true },
  });
}
