/**
 * Load a batch of products into the catalogue from the client's product sheet.
 *
 * Lisa keeps a Google Sheet of what should be on the site, adds to it, and asks
 * for a refresh. Run this against the sheet's CSV export and it brings the
 * catalogue up to date: new rows are added, rows already present are left
 * alone, and nothing is ever duplicated.
 *
 *   node --env-file=.env scripts/import-catalogue.mjs --csv <url|path> --dry-run
 *   node --env-file=.env scripts/import-catalogue.mjs --csv <url|path>
 *
 * A sheet row that has no product URL is skipped — those are the lines Lisa is
 * still filling in.
 *
 * Prices come only from a page that states GBP. Several of these shops price by
 * where the visitor is, so an unlabelled number is not a price: it is a number.
 * Run this from the UK server, or from anywhere and expect fewer prices.
 *
 * Products whose page defeats an automated read (the big fashion houses all sit
 * behind bot protection) are still created, with the sheet's own wording as the
 * name and no price or photograph. The tracking link works either way, which is
 * the part that earns; the listing is reported at the end so the gap can be
 * filled by hand.
 *
 * --json takes the same records after they have been prepared elsewhere:
 *   [{ url, name, category, brandName, pricePence, imageUrl, description,
 *      assignTo? }]
 */

import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// --- the sheet's section headings, mapped onto the site's categories --------
// A section that isn't here is a mistake, not a new category: products would
// be created into a category with no page and never appear anywhere.
const CATEGORY = {
  "Woman Fashion": "Women's Fashion",
  "Women's Fashion": "Women's Fashion",
  "Beauty & Skincare": "Beauty & Skincare",
  "Shoes & accessories": "Shoes & Accessories",
  "Shoes & Accessories": "Shoes & Accessories",
  "Travel Essentials": "Travel / Holiday",
  "Travel / Holiday": "Travel / Holiday",
  "Home & Garden": "Home",
  Home: "Home",
  "Fitness & Lifestyle": "Fitness & Lifestyle",
  "Festival Edit": "Festival Edit",
  "Cocktail Edit": "Cocktail Edit",
  "Day at The Races": "Day at the Races",
  "Day at the Races": "Day at the Races",
  "Christmas Edit": "Christmas Edit",
  "Mini Edit": "Mini Edit",
  "New You - Transformation Edit": "New You",
  "New You": "New You",
  "IT Girl Edit": "IT Girl Edit",
};

const BRAND_DEFAULTS = {
  status: "ACTIVE",
  seeded: true,
  trackingMethod: "DISCOUNT_CODE",
  commissionRate: 11,
  returnWindowDays: 30,
  attributionWindowDays: 30,
  settlementDays: 30,
};

// --- arguments --------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const csvSource = flag("--csv");
const jsonSource = flag("--json");
const dryRun = args.includes("--dry-run");

if (!csvSource && !jsonSource) {
  console.error("Give me a sheet: --csv <url|path>, or --json <path>.");
  process.exit(1);
}

// --- small helpers ----------------------------------------------------------

function slugify(input) {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Strip tracking noise so the same product always yields the same key. */
function canonicalUrl(raw) {
  const url = new URL(raw.trim());
  url.hash = "";
  const junk = /^(utm_|fbclid|gclid|mc_|ref$|source$|_branch)/i;
  for (const key of [...url.searchParams.keys()]) {
    if (junk.test(key)) url.searchParams.delete(key);
  }
  url.protocol = "https:";
  url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  return url.toString().replace(/\/$/, "");
}

/** brand.co.uk from shop.brand.co.uk, so one brand keeps one record. */
function registrableHost(raw) {
  const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  const parts = host.split(".");
  const compound = /^(co|com|org|net|ac|gov)\.[a-z]{2}$/.test(parts.slice(-2).join("."));
  return parts.slice(compound ? -3 : -2).join(".");
}

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function generateCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

async function allocateCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const taken = await db.trackingLink.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  return generateCode(10);
}

async function uniqueSlug(find, base) {
  const slug = base || "product";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    if (!(await find(candidate))) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

// --- reading the sheet ------------------------------------------------------

/** RFC 4180 enough for a Google Sheets export: quotes, commas, newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * The sheet is laid out as a section heading followed by its products, and the
 * heading is the only thing that says which category a row belongs to.
 */
function readSheet(text) {
  const out = [];
  let section = null;
  const unknown = new Set();

  for (const raw of parseCsv(text)) {
    const [, brand = "", site = "", description = "", url = ""] = raw.map((c) => c.trim());
    if (!brand && !site && !description && !url) continue;

    const isHeading = brand && !site && !description && !url;
    const isColumnRow = site.toLowerCase() === "website" && url.toLowerCase() === "url";
    if (isHeading || isColumnRow) {
      if (brand.toLowerCase() === "category") continue;
      section = brand;
      if (!CATEGORY[section]) unknown.add(section);
      continue;
    }
    if (!/^https?:\/\//i.test(url)) continue; // a line still being filled in

    out.push({ section, brandName: brand, site, description, url });
  }

  if (unknown.size) {
    console.error(
      `\nThe sheet has ${unknown.size} section(s) this importer doesn't know:\n` +
        [...unknown].map((s) => `  · ${s}`).join("\n") +
        "\n\nAdd each one to CATEGORY here and to CATEGORY_NAV in src/lib/demo-data.ts" +
        " — a category with no tile has no page for its products to appear on.\n"
    );
    process.exit(1);
  }
  return out;
}

// --- reading a product page -------------------------------------------------

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-GB,en;q=0.9",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "upgrade-insecure-requests": "1",
};

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html, ...names) {
  for (const name of names) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tag = html.match(
      new RegExp(`<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${esc}["'][^>]*>`, "i")
    )?.[0];
    const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content?.trim()) return decodeEntities(content.trim());
  }
  return null;
}

function findProductNode(node, found = {}) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const n of node) findProductNode(n, found);
    return found;
  }
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  if (types.includes("Product") && !found.node) {
    const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
    const image = Array.isArray(node.image) ? node.image[0] : node.image;
    found.node = {
      name: typeof node.name === "string" ? node.name : null,
      image: typeof image === "string" ? image : image?.url ?? image?.contentUrl ?? null,
      description: typeof node.description === "string" ? node.description : null,
      price: offers?.price ?? offers?.lowPrice ?? offers?.priceSpecification?.price ?? null,
      currency: offers?.priceCurrency ?? offers?.priceSpecification?.priceCurrency ?? null,
    };
  }
  for (const value of Object.values(node)) findProductNode(value, found);
  return found;
}

function fromJsonLd(html) {
  for (const block of html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    let data;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const { node } = findProductNode(data);
    if (node) return node;
  }
  return null;
}

function parsePence(value) {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^\d.,]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const amount = Number.parseFloat(cleaned.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100);
}

async function readProductPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let html;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal });
    if (!res.ok) return { blocked: `HTTP ${res.status}` };
    html = await res.text();
  } catch (err) {
    return { blocked: String(err.message ?? err).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }

  const ld = fromJsonLd(html) ?? {};
  const currency = ld.currency ?? meta(html, "product:price:currency", "og:price:currency");
  const rawPrice = ld.price ?? meta(html, "product:price:amount", "og:price:amount");
  const image = ld.image ?? meta(html, "og:image", "og:image:url", "twitter:image");
  const title =
    ld.name ??
    meta(html, "og:title", "twitter:title") ??
    decodeEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");

  return {
    title: title || null,
    description: ld.description ?? meta(html, "og:description", "description"),
    // http:// images are blocked as mixed content on the live site.
    imageUrl: image ? new URL(image, url).toString().replace(/^http:\/\//, "https://") : null,
    pricePence: currency?.toUpperCase() === "GBP" ? parsePence(rawPrice) : null,
    currency: currency ?? null,
  };
}

// --- writing ----------------------------------------------------------------

async function findOrCreateBrand(record) {
  // Match on the site first: the sheet spells the same brand several ways
  // ("Heat-Treats" and "Heat and Treats"), and each spelling would otherwise
  // become its own brand with its own commercial terms.
  const host = registrableHost(record.url);
  const brands = await db.brand.findMany({ select: { id: true, name: true, websiteUrl: true, slug: true } });
  const existing = brands.find((b) => {
    if (!b.websiteUrl) return false;
    try {
      return registrableHost(b.websiteUrl) === host;
    } catch {
      return false;
    }
  });
  if (existing) return { brand: existing, created: false };

  const name = record.brandName?.trim() || host;
  let slug = slugify(name);
  if (brands.some((b) => b.slug === slug)) slug = `${slug}-${host.split(".")[0]}`;

  if (dryRun) return { brand: { id: "dry-run", name, slug }, created: true };
  const brand = await db.brand.create({
    data: { name, slug, websiteUrl: new URL(record.url).origin, ...BRAND_DEFAULTS },
  });
  return { brand, created: true };
}

/**
 * Spread the batch over the roster rather than piling it on one storefront,
 * and keep it deterministic so a re-run doesn't shuffle anyone's shop.
 */
async function pickCreator(record, creators) {
  if (record.assignTo) {
    const named = creators.find((c) => c.handle === record.assignTo);
    if (named) {
      named.listings++;
      return named;
    }
  }
  const next = creators.reduce((a, b) =>
    b.listings < a.listings || (b.listings === a.listings && b.handle < a.handle) ? b : a
  );
  next.listings++;
  return next;
}

async function main() {
  const records = jsonSource
    ? JSON.parse(readFileSync(jsonSource, "utf8"))
    : readSheet(
        /^https?:\/\//.test(csvSource)
          ? await (await fetch(csvSource)).text()
          : readFileSync(csvSource, "utf8")
      );

  console.log(
    `Read ${records.length} product row(s) from ${jsonSource ?? csvSource}.`
  );

  const creators = (
    await db.creatorProfile.findMany({
      where: {
        status: "APPROVED",
        source: "ADMIN_ADDED",
        profileReleasedAt: { not: null },
      },
      select: { id: true, handle: true, _count: { select: { creatorProducts: true } } },
      orderBy: { handle: "asc" },
    })
  ).map((c) => ({ id: c.id, handle: c.handle, listings: c._count.creatorProducts }));

  if (creators.length === 0) throw new Error("No released creators to attach listings to.");

  const added = [];
  const skipped = [];
  const incomplete = [];

  for (const record of records) {
    const sourceUrl = canonicalUrl(record.url);
    const category = record.category ?? CATEGORY[record.section];

    const existing = await db.product.findUnique({
      where: { sourceUrl },
      select: { id: true, name: true },
    });
    if (existing) {
      skipped.push(`${existing.name} — already in the catalogue`);
      continue;
    }

    // --json arrives already read; a sheet row has to be looked up.
    const page = record.name ? record : await readProductPage(record.url);
    const name = (record.name ?? page.title ?? record.description ?? "").trim();
    if (!name) {
      incomplete.push(`${record.url} — no name on the page and none in the sheet`);
      continue;
    }

    const { brand, created } = await findOrCreateBrand(record);
    if (created) console.log(`  + brand ${brand.name}`);

    const creator = await pickCreator(record, creators);

    if (dryRun) {
      added.push(`${name} → ${category} → @${creator.handle} (${brand.name})`);
      if (!page.pricePence || !page.imageUrl) {
        incomplete.push(
          `${name} — ${[!page.pricePence && "no GBP price", !page.imageUrl && "no photograph"]
            .filter(Boolean)
            .join(", ")}`
        );
      }
      continue;
    }

    const productSlug = await uniqueSlug(
      (slug) =>
        db.product.findUnique({
          where: { brandId_slug: { brandId: brand.id, slug } },
          select: { id: true },
        }),
      slugify(name)
    );

    const product = await db.product.create({
      data: {
        brandId: brand.id,
        name,
        slug: productSlug,
        description: record.description ?? page.description ?? null,
        imageUrl: record.imageUrl ?? page.imageUrl ?? null,
        pricePence: record.pricePence ?? page.pricePence ?? null,
        currency: "GBP",
        category,
        sourceUrl,
      },
    });

    const listingSlug = await uniqueSlug(
      (slug) =>
        db.creatorProduct.findUnique({
          where: { profileId_slug: { profileId: creator.id, slug } },
          select: { id: true },
        }),
      slugify(name)
    );

    await db.creatorProduct.create({
      data: {
        profileId: creator.id,
        productId: product.id,
        slug: listingSlug,
        trackingLink: {
          create: {
            code: await allocateCode(),
            // The brand's own product page until a signed affiliate URL
            // replaces it. The code never changes, so that swap is invisible
            // to every link already posted.
            destinationUrl: record.url,
            isPlaceholder: true,
          },
        },
      },
    });

    added.push(`${name} → ${category} → @${creator.handle} (${brand.name})`);
    if (!product.pricePence || !product.imageUrl) {
      incomplete.push(
        `@${creator.handle}/${listingSlug} — ${[
          !product.pricePence && "no GBP price",
          !product.imageUrl && "no photograph",
        ]
          .filter(Boolean)
          .join(", ")}`
      );
    }
  }

  console.log(`\n${dryRun ? "Would add" : "Added"} ${added.length} listing(s):`);
  for (const line of added) console.log(`  · ${line}`);
  if (skipped.length) {
    console.log(`\nAlready live, left alone — ${skipped.length}:`);
    for (const line of skipped) console.log(`  · ${line}`);
  }
  if (incomplete.length) {
    console.log(`\nNeeds a price or a photograph adding by hand — ${incomplete.length}:`);
    for (const line of incomplete) console.log(`  · ${line}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
