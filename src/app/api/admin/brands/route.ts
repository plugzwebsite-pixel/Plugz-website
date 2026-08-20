import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { platformDefaultRates } from "@/lib/commission";
import { z } from "zod";

/**
 * Create a brand.
 *
 * The onboarding form has looked complete since the design phase and saved
 * nothing. It waited, then said "Brand onboarded". Anyone using it would have
 * believed a brand existed when it did not, and then found no tracking keys to
 * issue and nothing for products to attach to.
 *
 * The numeric fields are typed the way a person writes them: "11%", "14 days",
 * "30 days after verified", so they are read leniently rather than rejected.
 */

/** "11%" → 11 · "14 days" → 14 · "30 days after verified" → 30 */
function firstNumber(value: string | undefined, fallback: number): number {
  const m = value?.match(/[\d.]+/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * "Sam Carter · Head of Growth · sam@brand.com", in any order, with whatever
 * separator the person typing happened to use.
 *
 * The address is lifted out by pattern rather than by splitting first, because
 * a separator we don't recognise would otherwise put the whole line into the
 * email column and leave an address nothing can send to.
 */
function splitContact(value: string | undefined) {
  const text = value?.trim();
  if (!text) return { name: null, role: null, email: null };

  const match = text.match(/[^\s<>,;|·]+@[^\s<>,;|·]+\.[a-z]{2,}/i);
  const email = match ? match[0].replace(/[.,;]$/, "") : null;

  const rest = (email ? text.replace(match![0], " ") : text)
    .split(/[·•|,;\n]|\s{2,}| - /)
    .map((p) => p.trim().replace(/^[-\u2013\u2014<]\s*|\s*[-\u2013\u2014<>]$/g, "").trim())
    .filter(Boolean);

  return { name: rest[0] ?? null, role: rest[1] ?? null, email };
}

const schema = z.object({
  name: z.string().trim().min(1, "Give the brand a name").max(120),
  websiteUrl: z.string().trim().max(500).optional(),
  hasAffiliateProgramme: z.boolean(),
  platform: z.enum(["SHOPIFY", "WOOCOMMERCE", "OTHER"]).optional(),
  trackingMethod: z.enum(["PLUGGZ_DIRECT", "DISCOUNT_CODE", "PIXEL", "NETWORK"]).optional(),
  commissionRate: z.string().trim().max(40).optional(),
  returnWindow: z.string().trim().max(60).optional(),
  attributionWindow: z.string().trim().max(60).optional(),
  settlementTerms: z.string().trim().max(80).optional(),
  invoicingDetails: z.string().trim().max(500).optional(),
  contact: z.string().trim().max(200).optional(),
  networkName: z.string().trim().max(120).optional(),
  publisherId: z.string().trim().max(120).optional(),
  deepLinkPattern: z.string().trim().max(500).optional(),
});

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 60) || "brand";

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "brand-create"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  // Keep the slug unique without making the admin think about it.
  const base = slugify(input.name);
  let slug = base;
  for (let n = 2; await db.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }

  let website = input.websiteUrl?.trim() ?? "";
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  const contact = splitContact(input.contact);

  const brand = await db.brand.create({
    data: {
      name: input.name.trim(),
      slug,
      websiteUrl: website || null,
      // Live from the moment it is created. An inactive brand's postbacks are
      // rejected, and the point of onboarding one is to start tracking.
      status: "ACTIVE",
      hasAffiliateProgramme: input.hasAffiliateProgramme,
      platform: input.platform ?? "OTHER",
      // A direct deal defaults to our own link, which is the launch path and
      // what the postback verifies against; a brand already on a network keeps
      // its deep link. A Shopify shop reports through the pixel, so say so:
      // the admin screens read this to decide what to offer.
      trackingMethod:
        input.trackingMethod ??
        (input.hasAffiliateProgramme
          ? "NETWORK"
          : input.platform === "SHOPIFY"
            ? "PIXEL"
            : "PLUGGZ_DIRECT"),
      commissionRate: firstNumber(input.commissionRate, 11),
      returnWindowDays: Math.round(firstNumber(input.returnWindow, 30)),
      attributionWindowDays: Math.round(firstNumber(input.attributionWindow, 30)),
      settlementDays: Math.round(firstNumber(input.settlementTerms, 30)),
      invoicingDetails: input.invoicingDetails?.trim() || null,
      contactName: contact.name,
      contactRole: contact.role,
      contactEmail: contact.email,
      networkName: input.networkName?.trim() || null,
      publisherId: input.publisherId?.trim() || null,
      deepLinkPattern: input.deepLinkPattern?.trim() || null,
      // A real commercial relationship, not part of the demo catalogue, so it
      // survives the query that clears the seeded brands.
      seeded: false,
    },
    select: {
      id: true, name: true, slug: true, commissionRate: true,
      returnWindowDays: true, attributionWindowDays: true, settlementDays: true,
    },
  });

  // Split this brand's rate the way the platform splits everything else.
  //
  // Brand.commissionRate is what the brand pays us. The creator/Pluggz split is
  // a separate thing, read from a CommissionOverride and falling back to the
  // platform default. Without this, a brand onboarded at 12% would be invoiced
  // 12% while the engine paid out the default 8 + 5 = 13%, a loss on every
  // sale, and a discrepancy the brand can see on their own dashboard.
  const defaults = await platformDefaultRates();
  const total = defaults.creatorRate + defaults.pluggzRate;
  const rate = Number(brand.commissionRate);

  if (total > 0 && Math.abs(rate - total) > 0.005) {
    const creatorRate = Math.round(((rate * defaults.creatorRate) / total) * 100) / 100;
    await db.commissionOverride.create({
      data: {
        brandId: brand.id,
        creatorRate,
        // Pluggz takes the remainder, so the two always sum to exactly what the
        // brand is charged rather than drifting by a rounded penny.
        pluggzRate: Math.round((rate - creatorRate) * 100) / 100,
      },
    });
  }

  // Issue the credentials now rather than making it a second, separate errand.
  //
  // Whatever the shop runs on, the very next thing the person onboarding it
  // needs is something to hand the brand: a snippet with the key baked in for
  // Shopify, or the key and secret for anyone whose developer will be calling
  // the postback. Both start here, so both are minted here.
  //
  // The secret is returned exactly once, in this response, and only its stored
  // copy remains afterwards. Rolling it later means calling the credentials
  // endpoint, which replaces both.
  const key = `pz_live_${randomBytes(18).toString("hex")}`;
  const secret = randomBytes(32).toString("hex");
  await db.brand.update({
    where: { id: brand.id },
    data: { trackingKey: key, trackingSecret: secret },
  });

  return ok({ ...brand, platform: input.platform ?? "OTHER", key, secret }, 201);
}
