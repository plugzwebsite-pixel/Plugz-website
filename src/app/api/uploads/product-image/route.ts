import { ok, fail } from "@/lib/http";
import { getSession } from "@/lib/auth/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { storeProductImage } from "@/lib/product-image";

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
