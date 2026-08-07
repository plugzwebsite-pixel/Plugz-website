import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { checkCreatorAccess } from "@/lib/auth/access";
import { z } from "zod";

const patchSchema = z.object({
  live: z.boolean().optional(),
  review: z.string().trim().max(1000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

/** Confirm the listing belongs to the signed-in creator before touching it. */
async function ownedListing(id: string, profileId: string) {
  return db.creatorProduct.findFirst({
    where: { id, profileId },
    select: { id: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkCreatorAccess();
  if (!access.ok) return fail("You don't have access to this.", 403);

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid update", 422);

  if (!(await ownedListing(id, access.profileId))) {
    return fail("Not found", 404);
  }

  const updated = await db.creatorProduct.update({
    where: { id },
    data: parsed.data,
    select: { id: true, live: true, review: true, rating: true },
  });
  return ok(updated);
}

/**
 * Remove a product from the storefront.
 *
 * This deletes the listing and its tracking link, which means any link the
 * creator already published to social stops resolving to this product. The
 * shared master product record is left alone — other creators may be plugging
 * the same item.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await checkCreatorAccess();
  if (!access.ok) return fail("You don't have access to this.", 403);

  const { id } = await params;
  if (!(await ownedListing(id, access.profileId))) {
    return fail("Not found", 404);
  }

  await db.creatorProduct.delete({ where: { id } });
  return ok({ deleted: true });
}
