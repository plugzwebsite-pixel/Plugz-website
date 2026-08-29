import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Clearing the cached pages a creator's own actions change.
 *
 * Every public page here is cached, which is the point of them. The catch is
 * that a creator changing something is the one person certain to go and look
 * at it immediately, and they were being shown the version from before they
 * acted. Releasing a profile was the worst of it: the storefront had been
 * requested and cached as a 404 while the profile was still private, so the
 * first thing a new creator saw after going live was their own page saying it
 * did not exist. It would have come right on its own eventually, which is
 * exactly the kind of fault nobody can reproduce on request.
 *
 * A literal path is passed without a type, and a route pattern with one. That
 * is not a style choice: this version of Next requires the type for a pattern
 * and requires it to be omitted for a literal path, and getting it the wrong
 * way round is silent. `revalidatePath("/@someone", "page")` looked correct,
 * ran without complaint, and cleared nothing at all.
 */

/** The storefront itself, and the places a creator appears once they are live. */
export function revalidateStorefront(handle: string) {
  if (!handle) return;
  revalidatePath(`/@${handle}`);
  // The homepage wall and the sitemap both list creators.
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

/**
 * A listing being added, changed or taken down.
 *
 * The product page, the storefront it sits on, and the category it appears in.
 * The category page is cleared by its route pattern rather than by name, so
 * this does not have to know which category the product is in to be correct.
 */
export function revalidateListing(input: { handle: string; slug?: string | null }) {
  if (!input.handle) return;
  if (input.slug) revalidatePath(`/@${input.handle}/${input.slug}`);
  revalidatePath(`/@${input.handle}`);
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}
