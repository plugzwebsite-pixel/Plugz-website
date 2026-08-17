import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { publicBrand } from "@/lib/queries";
import { z } from "zod";

/**
 * Saving a product to come back to.
 *
 * Open to anyone signed in rather than gated to the shopper role: a creator
 * browsing the site is still a person who might want to save something, and a
 * role check here would only turn them away from their own platform.
 *
 * What is saved is the creator's listing, not the master product. On Pluggz
 * the recommendation is the thing worth coming back to.
 */
const schema = z.object({ listingId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return fail("Sign in to save this.", 401);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  // Only something a shopper could actually be looking at. Without this a
  // listing that has been taken down, or the demonstration shop's, could be
  // saved by posting its id directly.
  const listing = await db.creatorProduct.findFirst({
    where: {
      id: parsed.data.listingId,
      live: true,
      product: { brand: publicBrand },
    },
    select: { id: true },
  });
  if (!listing) return fail("That product is no longer available.", 404);

  // Saving twice is the same save. Upsert rather than create so a double tap
  // on a slow connection does not come back as an error.
  await db.wishlistItem.upsert({
    where: { userId_creatorProductId: { userId: user.id, creatorProductId: listing.id } },
    update: {},
    create: { userId: user.id, creatorProductId: listing.id },
  });

  return ok({ saved: true });
}

export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user) return fail("Sign in first.", 401);

  const listingId = new URL(req.url).searchParams.get("listingId");
  if (!listingId) return fail("Which one?", 400);

  // Scoped to this user, so nobody can clear somebody else's list.
  await db.wishlistItem.deleteMany({
    where: { userId: user.id, creatorProductId: listingId },
  });

  return ok({ saved: false });
}
