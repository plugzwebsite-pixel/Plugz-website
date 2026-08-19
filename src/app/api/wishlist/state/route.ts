import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { publicBrand } from "@/lib/queries";

/**
 * What this visitor has saved.
 *
 * Asked for by the save button after the page has rendered, which is what
 * keeps every product page and browse grid cacheable. Reading the session
 * during the render would make them per-visitor and give up that caching for
 * a heart icon.
 *
 * Returns ids rather than products: the caller already has the product in
 * front of it and only needs to know which state to draw.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) return ok({ signedIn: false, listingIds: [] });

  // The same filter the save action and the account page both apply. Without
  // it a listing since unpublished still draws a filled heart here while
  // correctly not appearing in their saved items, which is one item shown in
  // two states depending on which code path you look through.
  const rows = await db.wishlistItem.findMany({
    where: {
      userId: user.id,
      creatorProduct: { live: true, product: { brand: publicBrand } },
    },
    select: { creatorProductId: true },
  });

  return ok({ signedIn: true, listingIds: rows.map((r) => r.creatorProductId) });
}
