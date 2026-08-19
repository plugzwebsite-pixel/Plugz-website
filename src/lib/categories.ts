import "server-only";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * The lifestyle categories, read once and shared.
 *
 * Four public surfaces need this list on nearly every render: the homepage
 * tiles, the header, each category page, and the sitemap. Reading it from the
 * database in the marketing layout would put a query in front of every page on
 * the site, so it is cached under a tag and the admin route clears that tag
 * when something changes. An edit is live immediately rather than waiting out
 * a revalidate window.
 */
export const CATEGORY_TAG = "categories";

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  cover: string | null;
  video: string | null;
  sortOrder: number;
  inNav: boolean;
  active: boolean;
  banner: {
    imageUrl: string;
    href: string | null;
    label: string | null;
  } | null;
};

function toRecord(row: {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  coverUrl: string | null;
  videoUrl: string | null;
  sortOrder: number;
  inNav: boolean;
  active: boolean;
  bannerImageUrl: string | null;
  bannerHref: string | null;
  bannerLabel: string | null;
  bannerActive: boolean;
}): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    emoji: row.emoji,
    cover: row.coverUrl,
    video: row.videoUrl,
    sortOrder: row.sortOrder,
    inNav: row.inNav,
    active: row.active,
    // Only a banner with an image is a banner. A half-filled row would
    // otherwise render an empty box on the category page.
    banner:
      row.bannerActive && row.bannerImageUrl
        ? {
            imageUrl: row.bannerImageUrl,
            href: row.bannerHref,
            label: row.bannerLabel,
          }
        : null,
  };
}

const select = {
  id: true,
  name: true,
  slug: true,
  emoji: true,
  coverUrl: true,
  videoUrl: true,
  sortOrder: true,
  inNav: true,
  active: true,
  bannerImageUrl: true,
  bannerHref: true,
  bannerLabel: true,
  bannerActive: true,
} as const;

/** Everything, including hidden ones. Admin only. */
export async function allCategories(): Promise<CategoryRecord[]> {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select,
  });
  return rows.map(toRecord);
}

/** What a shopper can see, in the order the team set. */
export const publicCategories = unstable_cache(
  async (): Promise<CategoryRecord[]> => {
    const rows = await db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select,
    });
    return rows.map(toRecord);
  },
  ["public-categories"],
  { tags: [CATEGORY_TAG] }
);

/**
 * The handful the header has room for.
 *
 * Falls back to the first few by position when nothing is flagged. `inNav`
 * defaults to false, correctly, since a new category should not appear in the
 * header unasked, but that means a set of categories created entirely through
 * the admin screen would leave the header with no links at all. Better to show
 * the first three than to show nothing.
 */
export async function navCategories(limit = 3): Promise<CategoryRecord[]> {
  const live = await publicCategories();
  const chosen = live.filter((c) => c.inNav);
  return chosen.length > 0 ? chosen : live.slice(0, limit);
}

export async function categoryBySlug(slug: string): Promise<CategoryRecord | null> {
  return (await publicCategories()).find((c) => c.slug === slug) ?? null;
}

/**
 * Call after any write, so every public surface picks the change up at once.
 *
 * `expire: 0` rather than a stale-while-revalidate profile: the team edits a
 * category and then looks at the site to check it, so serving them the old
 * copy once would read as the save having failed. Next 16 requires the second
 * argument; the one-argument form is deprecated.
 */
export function categoriesChanged() {
  revalidateTag(CATEGORY_TAG, { expire: 0 });

  // Clearing the tag drops the cached *data*, but each page is separately
  // cached by ISR and will serve its stale copy once while it regenerates. The
  // team edits a category and refreshes to check, so that one stale response
  // is precisely the one they see, and it reads as the save having failed.
  // These clear the rendered pages as well.
  //
  // The layout is the blunt one, and deliberately: the header carries the
  // category links and the header is on every page, so a change to what
  // appears there really does affect all of them. Category edits happen a
  // handful of times a month, so paying for a full refresh is the cheaper
  // mistake than showing the team something they have just changed.
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/", "layout");

  // Its own hourly window rather than a consumer of the tag, so it needs
  // telling separately or a new category is live on the site but missing from
  // the sitemap for up to an hour.
  revalidatePath("/sitemap.xml");
}

/**
 * A URL-safe slug from a category name.
 *
 * Kept here rather than in the form so a category added through the API gets
 * the same slug as one added on screen.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Is this a category somebody may choose right now?
 *
 * Validation only checks the shape of the name; whether it exists is a
 * question for the database, because the team can add one at any time and a
 * list compiled into the build would refuse it.
 */
export async function isChoosableCategory(name: string): Promise<boolean> {
  return (await publicCategories()).some((c) => c.name === name);
}

/** Drop anything that is not a live category, for a list of interests. */
export async function keepChoosableCategories(names: string[]): Promise<string[]> {
  const live = new Set((await publicCategories()).map((c) => c.name));
  return names.filter((n) => live.has(n));
}
