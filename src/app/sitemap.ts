import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicBrand, publiclyVisibleCreator } from "@/lib/queries";
import { CATEGORY_NAV } from "@/lib/demo-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pluggzofficial.co.uk";

// Rebuilt on the same cadence as the pages it lists.
export const revalidate = 3600;

/**
 * Every page a shopper could land on from search: the storefronts and product
 * pages are the whole point of the platform being discoverable, so they belong
 * here rather than only the handful of static marketing routes.
 *
 * Only creators who have released their profile appear, the same consent rule
 * the rest of the site follows. Listing an unreleased profile would publish it
 * to Google before the creator agreed to it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${siteUrl}/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/legal/creator-terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...CATEGORY_NAV.map((c) => ({
      url: `${siteUrl}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  try {
    const [creators, products] = await Promise.all([
      db.creatorProfile.findMany({
        where: publiclyVisibleCreator,
        select: { handle: true, updatedAt: true },
      }),
      db.creatorProduct.findMany({
        where: { live: true, profile: publiclyVisibleCreator, product: { brand: publicBrand } },
        select: {
          slug: true,
          updatedAt: true,
          profile: { select: { handle: true } },
        },
        take: 5000,
      }),
    ]);

    return [
      ...staticRoutes,
      ...creators.map((c) => ({
        url: `${siteUrl}/@${c.handle}`,
        lastModified: c.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
      ...products.map((p) => ({
        url: `${siteUrl}/@${p.profile.handle}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // A database blip must not take the sitemap down entirely, so serve the
    // static routes rather than a 500.
    return staticRoutes;
  }
}
