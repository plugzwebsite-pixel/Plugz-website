import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/access";
import { fail, ok, parseBody } from "@/lib/http";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isChoosableCategory } from "@/lib/categories";
import { revalidateListing } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  product: z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable(),
    imageUrl: z.string().trim().max(1000).nullable(),
    pricePence: z.number().int().min(0).max(100_000_00).nullable(),
    category: z.string().trim().min(2).max(48),
    sourceUrl: z.string().trim().url().max(1000).refine((value) => /^https?:\/\//i.test(value), {
      message: "Use an http or https product address",
    }),
  }).optional(),
  listing: z.object({
    review: z.string().trim().max(1000).nullable(),
    rating: z.number().int().min(1).max(5).nullable(),
    live: z.boolean(),
  }).optional(),
}).refine((value) => Boolean(value.product || value.listing), {
  message: "Nothing to update",
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-product-update"), 60, 60_000);
  if (!limit.ok) return fail("Slow down and try again.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const { id } = await params;

  const existing = await db.creatorProduct.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      slug: true,
      profile: { select: { handle: true } },
    },
  });
  if (!existing) return fail("That listing no longer exists.", 404);

  if (parsed.data.product && !(await isChoosableCategory(parsed.data.product.category))) {
    return fail("That category is not available.", 422, { category: "Choose an active category" });
  }

  try {
    await db.$transaction(async (tx) => {
      if (parsed.data.product) {
        await tx.product.update({
          where: { id: existing.productId },
          data: {
            ...parsed.data.product,
            description: parsed.data.product.description || null,
            imageUrl: parsed.data.product.imageUrl || null,
          },
        });
      }
      if (parsed.data.listing) {
        await tx.creatorProduct.update({
          where: { id },
          data: {
            ...parsed.data.listing,
            review: parsed.data.listing.review || null,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && /unique constraint/i.test(error.message)) {
      return fail("That product address is already used by another product.", 409);
    }
    console.error("[admin/products] update failed:", error);
    return fail("Couldn't save that product.", 500);
  }

  const affected = await db.creatorProduct.findMany({
    where: { productId: existing.productId },
    select: { slug: true, profile: { select: { handle: true } } },
  });
  for (const listing of affected) {
    revalidateListing({ handle: listing.profile.handle, slug: listing.slug });
  }

  return ok({ updated: true });
}
