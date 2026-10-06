import { db } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Look up what a tracking link does, without touching anything.
 *
 * The point is to check a link before it goes anywhere: what page it opens,
 * which brand and creator it credits, which discount code it carries. Nothing
 * here is counted and nothing is recorded, so testing a link can never pollute
 * the click figures or create a sale.
 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const limit = await rateLimit(clientKey(req, "tracking-resolve"), 30, 60_000);
  if (!limit.ok) return fail("Too many lookups. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const ref = new URL(req.url).searchParams.get("ref")?.trim();
  if (!ref) return fail("Enter a tracking reference to test.", 400);

  const link = await db.trackingLink.findUnique({
    where: { code: ref },
    select: {
      code: true,
      destinationUrl: true,
      discountCode: true,
      creatorProduct: {
        select: {
          product: {
            select: {
              name: true,
              brand: { select: { name: true } },
            },
          },
          profile: {
            select: {
              handle: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!link) {
    return fail(
      `No tracking link found for "${ref}". Check the reference and try again.`,
      404
    );
  }

  return ok({
    ref: link.code,
    destinationUrl: link.destinationUrl,
    brandName: link.creatorProduct.product.brand.name,
    creatorName: link.creatorProduct.profile.user.name,
    creatorHandle: link.creatorProduct.profile.handle,
    productName: link.creatorProduct.product.name,
    discountCode: link.discountCode,
  });
}
