import { ok, fail } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { storeProductImage, removeStoredProductImage } from "@/lib/product-image";

/**
 * Somewhere for a brand to put a photograph of their own product.
 *
 * Kept apart from the route that creates the product because the two happen at
 * different moments: the picture is chosen and previewed while the rest of the
 * form is still being filled in, and a single request would mean uploading it
 * again on every failed save.
 *
 * Open to brands and administrators only. It writes a file to this machine, so
 * it is not something an anonymous caller may do.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Tight, because each call writes to disk.
  const limit = await rateLimit(clientKey(req, "upload-product-image"), 30, 60_000);
  if (!limit.ok) return fail("Too many uploads. Try again shortly.", 429);

  const user = await getSession();
  if (!user) return fail("Sign in first.", 401);
  if (user.role !== "BRAND" && user.role !== "ADMIN") {
    return fail("Brands and administrators only.", 403);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Couldn't read that upload.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose an image first.", 400);

  const stored = await storeProductImage(file);
  if (!stored.ok) return fail(stored.error, 422);

  return ok({ url: stored.url });
}

/**
 * Throw away an upload nobody kept.
 *
 * Choosing a photograph, looking at it and choosing a different one used to
 * leave the first on disk with nothing pointing at it, for ever. That is a slow
 * leak rather than a fault, which is exactly the kind that is never noticed.
 *
 * Only a file no product references can go. The names are random, so this is
 * not a guessing game, but a brand should not be able to delete a picture that
 * is live on somebody's storefront by passing its address.
 */
export async function DELETE(req: Request) {
  const limit = await rateLimit(clientKey(req, "delete-product-image"), 60, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const user = await getSession();
  if (!user) return fail("Sign in first.", 401);
  if (user.role !== "BRAND" && user.role !== "ADMIN") {
    return fail("Brands and administrators only.", 403);
  }

  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!url.startsWith("/uploads/products/")) {
    return fail("That is not an uploaded product image.", 400);
  }

  const inUse = await db.product.count({ where: { imageUrl: url } });
  if (inUse > 0) return fail("That image is in use on a product.", 409);

  await removeStoredProductImage(url);
  return ok({ removed: true });
}
