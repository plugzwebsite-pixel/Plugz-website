import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";

/**
 * Campaign storefronts: the ones the team issues rather than a creator builds.
 *
 * Reads live here rather than in queries.ts because a campaign is not a
 * creator's storefront and should not quietly inherit its rules. It shares one
 * rule deliberately, though: a listing only appears if it would have appeared
 * anywhere else on the site. Being chosen for a campaign is not a way past the
 * checks that keep a suspended creator, an unreleased profile or the
 * demonstration shop off the public site.
 */

/** Only what a shopper may see, whichever page they see it on. */
const visibleListing = {
  live: true,
  profile: publiclyVisibleCreator,
  product: { brand: publicBrand },
};

export type CampaignCard = {
  slug: string;
  name: string;
  tagline: string | null;
  heroImageUrl: string | null;
  brandName: string | null;
  creatorCount: number;
  listingCount: number;
};

/** Campaigns a shopper can open: live, and inside their dates if they have any. */
export async function liveCampaigns(now = new Date()): Promise<CampaignCard[]> {
  const rows = await db.campaign.findMany({
    where: {
      status: "LIVE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      heroImageUrl: true,
      brand: { select: { name: true } },
      _count: { select: { creators: true, listings: true } },
    },
  });

  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    heroImageUrl: c.heroImageUrl,
    brandName: c.brand?.name ?? null,
    creatorCount: c._count.creators,
    listingCount: c._count.listings,
  }));
}

/**
 * One campaign, with everything its page shows.
 *
 * Returns null for a campaign that is not live, so a draft cannot be reached by
 * guessing its address before the team has finished writing it.
 */
export async function campaignBySlug(slug: string, now = new Date()) {
  const c = await db.campaign.findFirst({
    where: {
      slug,
      status: "LIVE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      name: true,
      slug: true,
      tagline: true,
      description: true,
      heroImageUrl: true,
      endsAt: true,
      brand: { select: { name: true, websiteUrl: true } },
      creators: {
        where: { profile: publiclyVisibleCreator },
        orderBy: { position: "asc" },
        select: {
          profile: {
            select: {
              handle: true,
              category: true,
              city: true,
              avatarUrl: true,
              user: { select: { name: true } },
            },
          },
        },
      },
      listings: {
        where: { creatorProduct: visibleListing },
        orderBy: { position: "asc" },
        select: {
          creatorProduct: {
            select: {
              id: true,
              slug: true,
              profile: { select: { handle: true, user: { select: { name: true } } } },
              trackingLink: { select: { code: true } },
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                  pricePence: true,
                  currency: true,
                  brand: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!c) return null;

  return {
    name: c.name,
    slug: c.slug,
    tagline: c.tagline,
    description: c.description,
    heroImageUrl: c.heroImageUrl,
    endsAt: c.endsAt,
    brand: c.brand,
    creators: c.creators.map((x) => ({
      handle: x.profile.handle,
      name: x.profile.user.name,
      category: x.profile.category,
      city: x.profile.city,
      avatarUrl: x.profile.avatarUrl,
    })),
    listings: c.listings.map((x) => ({
      id: x.creatorProduct.id,
      slug: x.creatorProduct.slug,
      handle: x.creatorProduct.profile.handle,
      creator: x.creatorProduct.profile.user.name,
      code: x.creatorProduct.trackingLink?.code ?? null,
      name: x.creatorProduct.product.name,
      imageUrl: x.creatorProduct.product.imageUrl,
      pricePence: x.creatorProduct.product.pricePence,
      currency: x.creatorProduct.product.currency,
      brandName: x.creatorProduct.product.brand.name,
    })),
  };
}

/** A URL-safe slug from a campaign name, the same shape categories use. */
export function campaignSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Call after any write, so the pages that list campaigns pick it up at once. */
export function campaignsChanged(slug?: string) {
  revalidatePath("/campaigns");
  if (slug) revalidatePath(`/campaign/${slug}`);
}
