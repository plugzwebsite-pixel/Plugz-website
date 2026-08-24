import "server-only";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * The parts of the homepage the team can change without a release.
 *
 * A headline gets reworded far more often than anybody expects, and every one
 * of those rewordings should not be a deployment. Keys and values rather than a
 * column each, so adding a new editable line later is a line of code here
 * instead of a migration.
 *
 * Every key has a default written beside it. Nothing on the homepage depends on
 * a row existing, so an empty table renders exactly what shipped.
 */
export const SITE_CONTENT_TAG = "site-content";

export const CONTENT_KEYS = {
  heroEyebrow: {
    label: "Eyebrow",
    hint: "The small line above the headline",
    fallback: "Shop what UK creators actually plug",
  },
  heroTitle: {
    label: "Headline",
    hint: "The first thing on the page",
    fallback: "The people you follow, and the things they use",
  },
  heroSubtitle: {
    label: "Sub-heading",
    hint: "One sentence under the headline",
    fallback:
      "Every product here was chosen by a creator, not an algorithm. Tap through and buy it from the brand itself.",
  },
  stripText: {
    label: "Promotional strip",
    hint: "Leave empty to hide the strip entirely",
    fallback: "",
  },
  stripHref: {
    label: "Strip link",
    hint: "Where the strip goes when tapped",
    fallback: "",
  },
} as const;

export type ContentKey = keyof typeof CONTENT_KEYS;

export type SiteContent = Record<ContentKey, string>;

function withFallbacks(rows: { key: string; value: string }[]): SiteContent {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as SiteContent;
  for (const key of Object.keys(CONTENT_KEYS) as ContentKey[]) {
    const value = stored.get(key);
    out[key] = value != null && value.trim() !== "" ? value : CONTENT_KEYS[key].fallback;
  }
  return out;
}

/**
 * What the homepage renders.
 *
 * Cached under a tag and cleared on save, so an edit is live on the next
 * refresh rather than whenever the page's own window happens to expire. The
 * team changes a line and then looks at the site to check it, and being shown
 * the old copy once reads as the save having failed.
 */
export const siteContent = unstable_cache(
  async (): Promise<SiteContent> => {
    const rows = await db.siteContent.findMany({ select: { key: true, value: true } });
    return withFallbacks(rows);
  },
  ["site-content"],
  { tags: [SITE_CONTENT_TAG] }
);

/** Raw values for the admin form, so an empty field shows as empty. */
export async function siteContentRaw(): Promise<Partial<Record<ContentKey, string>>> {
  const rows = await db.siteContent.findMany({ select: { key: true, value: true } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<
    Record<ContentKey, string>
  >;
}

export function siteContentChanged() {
  revalidateTag(SITE_CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "page");
}
