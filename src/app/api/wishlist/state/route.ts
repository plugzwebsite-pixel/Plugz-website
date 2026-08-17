import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { getSession } from "@/lib/auth/session";

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

  const rows = await db.wishlistItem.findMany({
    where: { userId: user.id },
    select: { creatorProductId: true },
  });

  return ok({ signedIn: true, listingIds: rows.map((r) => r.creatorProductId) });
}
