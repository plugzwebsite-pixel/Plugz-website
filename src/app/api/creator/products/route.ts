import type { Prisma } from "@prisma/client";
import { revalidateListing } from "@/lib/revalidate";
import { db } from "@/lib/db";
import { publicBrand } from "@/lib/queries";
import { isChoosableCategory } from "@/lib/categories";
import { ok, fail, parseBody } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { scrapeProduct, ScrapeError } from "@/lib/scrape";
import {
  findOrCreateBrand,
  findOrCreateProduct,
  addProductToCreator,
  canonicalUrl,
} from "@/lib/catalogue";
import { z } from "zod";

const addSchema = z
  .object({
    // Either paste a brand link, or claim something already in the central
    // catalogue that another creator has plugged.
    url: z.string().trim().min(8).optional(),
    productId: z.string().trim().min(1).optional(),
    category: z.string().trim().min(2).max(48).optional(),
    review: z.string().trim().max(1000).optional(),
    rating: z.number().int().min(1).max(5).optional(),
  })
  .refine((d) => Boolean(d.url) || Boolean(d.productId), {
    message: "Paste the product's link",
    path: ["url"],
  });

/**
 * What a creator is allowed to put on their storefront.
 *
 * The list below and the claim handler further down MUST agree. They did not:
 * the list filtered on this while the claim looked the product up by id alone,
 * so posting the id of a product the list would never offer - the demonstration
 * shop's, or a brand still in draft - minted a real tracking link for it.
 */
const pluggable = {
  status: "ACTIVE",
  ...publicBrand,
} satisfies Prisma.BrandWhereInput;

/** The creator's own storefront listings. */
export async function GET() {
  const access = await checkCreatorAccess();
  if (!access.ok) return fail("You don't have access to this.", 403);

  const items = await db.creatorProduct.findMany({
    where: { profileId: access.profileId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      live: true,
      video: {
        select: {
          id: true,
          uid: true,
          state: true,
          review: true,
          durationSeconds: true,
          thumbnailUrl: true,
          removedReason: true,
        },
      },
      review: true,
      rating: true,
      createdAt: true,
      product: {
        select: {
          name: true,
          imageUrl: true,
          pricePence: true,
          category: true,
          brand: { select: { name: true } },
        },
      },
      trackingLink: {
        select: {
          code: true,
          clickCount: true,
          isPlaceholder: true,
          discountCode: true,
        },
      },
    },
  });

  // The central link database: products already in the Pluggz catalogue that
  // this creator hasn't plugged yet, most-clicked first. Saves them hunting
  // down a URL for something another creator has already added.
  const available = await db.product.findMany({
    where: {
      brand: pluggable,
      creatorProducts: { none: { profileId: access.profileId } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      pricePence: true,
      category: true,
      brand: { select: { name: true } },
      _count: { select: { creatorProducts: true } },
    },
  });

  return ok({ items, available });
}

/**
 * Paste a brand product URL; Pluggz does the rest.
 *
 * Fetches the product's own page for its title, image, description and price,
 * attaches it to the shared master product record (so two creators plugging the
 * same item don't create two products), and mints the tracking link.
 */
export async function POST(req: Request) {
  const access = await checkCreatorAccess();
  if (!access.ok) return fail("You don't have access to this.", 403);

  // Scraping makes an outbound request per call, so this is limited harder
  // than an ordinary write.
  const limit = await rateLimit(clientKey(req, `addproduct:${access.profileId}`), 12, 60_000);
  if (!limit.ok) return fail("Slow down a moment, then try again.", 429);

  const parsed = await parseBody(req, addSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.category && !(await isChoosableCategory(input.category))) {
    return fail("That category no longer exists.", 422, {
      category: "Choose a category",
    });
  }

  const profile = await db.creatorProfile.findUnique({
    where: { id: access.profileId },
    select: { category: true, handle: true },
  });

  let product;
  let brand;

  if (input.productId) {
    // Claiming an existing catalogue entry, so no outbound fetch needed. The
    // brand clause is what makes this the same set the list offers; without it
    // any product id in the database is claimable.
    const existingProduct = await db.product.findFirst({
      where: { id: input.productId, brand: pluggable },
      include: { brand: true },
    });
    if (!existingProduct) {
      return fail("That product is not available to add.", 404);
    }
    product = existingProduct;
    brand = existingProduct.brand;
  } else {
    const raw = input.url!.startsWith("http") ? input.url! : `https://${input.url}`;

    let scraped;
    try {
      scraped = await scrapeProduct(raw);
    } catch (err) {
      if (err instanceof ScrapeError) return fail(err.message, 422, { url: err.message });
      console.error("[products] scrape failed:", err);
      return fail("We couldn't read that page. Try a different link.", 502);
    }

    if (!scraped.title) {
      return fail("We couldn't find a product on that page.", 422, {
        url: "No product details found at that link",
      });
    }

    brand = await findOrCreateBrand(scraped.url, scraped.siteName);
    product = await findOrCreateProduct({
      brandId: brand.id,
      name: scraped.title,
      sourceUrl: scraped.url,
      description: scraped.description,
      imageUrl: scraped.imageUrl,
      pricePence: scraped.pricePence,
      currency: scraped.currency,
      category: input.category ?? profile?.category ?? "Women's Fashion",
    });
  }

  const existing = await db.creatorProduct.findUnique({
    where: {
      profileId_productId: { profileId: access.profileId, productId: product.id },
    },
    select: { id: true },
  });
  if (existing) {
    return fail("That product is already on your storefront.", 409, {
      url: "Already on your storefront",
    });
  }

  const listing = await addProductToCreator({
    profileId: access.profileId,
    productId: product.id,
    productName: product.name,
    // Points at the brand's own page until the affiliate deal for this brand
    // lands. The short code below never changes when that destination is
    // swapped, so links already shared to social keep working.
    destinationUrl: canonicalUrl(product.sourceUrl),
    isPlaceholder: brand.status !== "ACTIVE",
    review: input.review,
    rating: input.rating,
  });

  // A creator adds a listing and goes straight to their storefront to look at
  // it. Without this they are shown the copy from before it existed.
  revalidateListing({ handle: profile?.handle ?? "", slug: listing.slug });

  return ok(
    {
      id: listing.id,
      slug: listing.slug,
      name: product.name,
      brand: brand.name,
      imageUrl: product.imageUrl,
      pricePence: product.pricePence,
      category: product.category,
      code: listing.trackingLink?.code ?? null,
      isPlaceholder: listing.trackingLink?.isPlaceholder ?? true,
      shareUrl: `/go/${listing.trackingLink?.code ?? ""}`,
      pageUrl: `/@${profile?.handle ?? ""}/${listing.slug}`,
    },
    201
  );
}
