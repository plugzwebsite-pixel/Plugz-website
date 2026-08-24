import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { scrapeProduct, ScrapeError } from "@/lib/scrape";
import { findOrCreateProduct, findProductBySourceUrl } from "@/lib/catalogue";
import { isChoosableCategory } from "@/lib/categories";

/**
 * Putting a brand's products into the catalogue, from the admin side.
 *
 * Until now the only way a product could exist was a creator pasting a link on
 * their own storefront, which meant onboarding a brand left you with a brand
 * and nothing to sell. The catalogue had to be filled by asking a creator to do
 * it, or by a bulk import run from a terminal.
 *
 * A product created here belongs to the brand and sits in the catalogue
 * unattached: no creator, no tracking link, nothing public. Creators pick it up
 * from "available to plug", and that is when a listing and its link are minted.
 * Keeping those two steps apart is deliberate, because a product on nobody's
 * storefront is inventory, and a listing is a commercial arrangement with a
 * named creator.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  brandId: z.string().trim().min(1, "Choose a brand"),
  url: z.string().trim().min(8, "Paste the product page address"),
  category: z.string().trim().min(2).max(48).optional(),
  /** Fill these in only to correct what the shop's own page reports. */
  name: z.string().trim().max(200).optional(),
  pricePence: z.number().int().positive().max(100_000_00).optional(),
  imageUrl: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "admin-products"), 40, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const brand = await db.brand.findUnique({
    where: { id: input.brandId },
    select: { id: true, name: true, status: true },
  });
  if (!brand) return fail("That brand doesn't exist.", 404, { brandId: "Choose a brand" });

  if (input.category && !(await isChoosableCategory(input.category))) {
    return fail("That category no longer exists.", 422, { category: "Choose a category" });
  }

  // Read the shop's own page for the title, picture and price. Some shops
  // defeat this entirely, which is why every field can be overridden below
  // rather than the whole thing failing.
  let scraped;
  try {
    scraped = await scrapeProduct(input.url);
  } catch (err) {
    if (err instanceof ScrapeError) {
      return fail(err.message, 422, { url: err.message });
    }
    console.error("[admin/products] scrape failed:", err);
    return fail("Couldn't read that page.", 502, { url: "Couldn't read that page" });
  }

  const name = input.name?.trim() || scraped.title;
  if (!name) {
    return fail("No product name found. Type one in and try again.", 422, {
      name: "Give the product a name",
    });
  }

  // Asked before creating, not inferred afterwards from how new the row looks:
  // adding the same address twice within seconds is exactly what someone does
  // when they are not sure the first one worked, and a timestamp cannot tell
  // those two cases apart.
  const already = await findProductBySourceUrl(scraped.url);

  // The brand-side route refuses this and the admin one did not, which was
  // worse rather than better: findOrCreateProduct returns the row that already
  // owns the address, so picking Brand A and pasting Brand B's link reported
  // success under Brand A's name while the product stayed Brand B's. A product
  // carries its owner's commission terms, so quietly moving one is a money
  // question, not a tidying one.
  if (already && already.brandId !== brand.id) {
    return fail(
      `That address is already in the catalogue under ${already.brand.name}.`,
      409,
      { url: `Already listed under ${already.brand.name}` }
    );
  }

  const product = await findOrCreateProduct({
    brandId: brand.id,
    name,
    sourceUrl: scraped.url,
    description: scraped.description,
    imageUrl: input.imageUrl?.trim() || scraped.imageUrl,
    pricePence: input.pricePence ?? scraped.pricePence,
    currency: scraped.currency,
    category: input.category ?? "Women's Fashion",
  });

  return ok(
    {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: brand.name,
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
