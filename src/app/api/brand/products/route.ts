import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { checkBrandAccess } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { scrapeProduct, ScrapeError } from "@/lib/scrape";
import { findOrCreateProduct, findProductBySourceUrl } from "@/lib/catalogue";
import { isChoosableCategory } from "@/lib/categories";

/**
 * A brand putting its own products into the catalogue.
 *
 * The same job the admin route does, with one difference that is the whole
 * point of it existing: the brand is never asked which brand it is. It comes
 * from the signed-in user's own record, so a brand can only ever add to itself,
 * whatever it puts in the request.
 *
 * A product created here is inventory, not a listing. It has no creator, no
 * tracking link and nothing public until a creator picks it up from "available
 * to plug". A brand adding a product is therefore offering it, not publishing
 * it, which is the right shape: what appears on a creator's storefront stays
 * the creator's decision.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    /** Their own product page. Everything else is read off it. */
    url: z.string().trim().min(8).optional(),
    category: z.string().trim().min(2).max(48).optional(),
    /** Typed in, for shops whose pages cannot be read automatically. */
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    pricePence: z.number().int().positive().max(100_000_00).optional(),
    imageUrl: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Boolean(v.url), {
    message: "Paste the address of the product page",
    path: ["url"],
  });

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "brand-products"), 40, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const access = await checkBrandAccess();
  if (!access.ok) return fail("Brands only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  if (input.category && !(await isChoosableCategory(input.category))) {
    return fail("That category no longer exists.", 422, { category: "Choose a category" });
  }

  // Read their own page for whatever it will give. A brand knows its products
  // better than any scraper, so anything it types in wins over what was found.
  let scraped;
  try {
    scraped = await scrapeProduct(input.url!);
  } catch (err) {
    if (err instanceof ScrapeError) return fail(err.message, 422, { url: err.message });
    console.error("[brand/products] scrape failed:", err);
    return fail("Couldn't read that page.", 502, { url: "Couldn't read that page" });
  }

  const name = input.name?.trim() || scraped.title;
  if (!name) {
    return fail("No product name found. Type one in and try again.", 422, {
      name: "Give the product a name",
    });
  }

  // Asked before creating rather than inferred afterwards, because adding the
  // same address twice in quick succession is exactly what somebody does when
  // they are not sure the first attempt worked.
  const already = await findProductBySourceUrl(scraped.url);

  // Another brand's product, reached by pasting their address. Refused rather
  // than quietly handed over, since a product carries the commission terms of
  // whoever owns it.
  if (already && already.brandId !== access.brandId) {
    return fail("That address already belongs to another brand.", 409, {
      url: "Already in the catalogue under a different brand",
    });
  }

  const product = await findOrCreateProduct({
    brandId: access.brandId,
    name,
    sourceUrl: scraped.url,
    description: input.description?.trim() || scraped.description,
    imageUrl: input.imageUrl?.trim() || scraped.imageUrl,
    pricePence: input.pricePence ?? scraped.pricePence,
    currency: scraped.currency,
    category: input.category ?? "Women's Fashion",
  });

  return ok(
    {
      id: product.id,
      name: product.name,
      brand: access.brandName,
      imageUrl: product.imageUrl,
      pricePence: product.pricePence,
      currency: product.currency,
      category: product.category,
      sourceUrl: product.sourceUrl,
      alreadyExisted: already !== null,
    },
    already ? 200 : 201
  );
}
