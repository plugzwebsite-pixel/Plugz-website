import "server-only";
import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Fetch a brand's product page and pull out title, image, description and
 * price, so a creator only has to paste a link.
 *
 * The URL comes from a user and is fetched by our server, which is a
 * server-side request forgery risk: without checks, a creator could paste
 * http://169.254.169.254/ or http://localhost:5432 and use Pluggz as a proxy
 * into our own network. Every hostname is resolved and checked against private
 * address space before we connect, and redirects are re-checked the same way.
 */

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

export type ScrapedProduct = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  pricePence: number | null;
  currency: string;
  siteName: string | null;
};

/** Reject loopback, link-local, private and reserved ranges. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fe80")) return true; // link-local
    if (/^f[cd]/.test(v6)) return true; // unique local
    // IPv4-mapped, e.g. ::ffff:127.0.0.1
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 0 || a === 127) return true; // this host / loopback
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScrapeError("That doesn't look like a valid link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("Only http and https links can be added.");
  }

  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new ScrapeError("That link isn't reachable.");
    return url;
  }

  let addresses;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new ScrapeError("We couldn't reach that site.");
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ScrapeError("That link isn't reachable.");
  }
  return url;
}

export class ScrapeError extends Error {}

async function fetchHtml(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual", // each hop is re-checked rather than blindly followed
        signal: controller.signal,
        headers: {
          "user-agent": "PluggzBot/1.0 (+https://pluggz.com)",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      clearTimeout(timer);
      throw new ScrapeError("We couldn't load that page. Check the link and try again.");
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new ScrapeError("We couldn't load that page.");
      current = new URL(location, url).toString();
      continue;
    }

    if (!res.ok) {
      throw new ScrapeError(`The brand's page returned an error (${res.status}).`);
    }

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) {
      throw new ScrapeError("That link isn't a product page.");
    }

    // Read with a hard ceiling rather than trusting content-length.
    const reader = res.body?.getReader();
    if (!reader) throw new ScrapeError("We couldn't read that page.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    await reader.cancel().catch(() => {});

    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c.subarray(0, Math.min(c.length, total - offset)), offset);
      offset += c.length;
      if (offset >= total) break;
    }
    return { html: new TextDecoder().decode(buf), finalUrl: url.toString() };
  }

  throw new ScrapeError("That link redirects too many times.");
}

function meta(html: string, ...names: string[]): string | null {
  for (const name of names) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${esc}["'][^>]*>`,
      "i"
    );
    const tag = html.match(pattern)?.[0];
    if (!tag) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content?.trim()) return decodeEntities(content.trim());
  }
  return null;
}

/**
 * Shops write em and en dashes into their own titles and copy, and whatever we
 * read lands on a Pluggz page under our name. The client reads a dash as a sign
 * the words were not written by a person, so it is normalised on the way in
 * rather than left for someone to find on a product page later.
 *
 * A dash between two words is always standing in for punctuation we can write
 * properly; a dash between two digits is a range, and a hyphen keeps that
 * readable.
 */
function plainDashes(s: string): string {
  return s
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Shops increasingly publish structured data; it beats guessing from meta tags. */
function fromJsonLd(html: string): { name?: string; image?: string; description?: string; price?: string; currency?: string } {
  const blocks = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const raw of nodes) {
      const node = raw as Record<string, unknown>;
      const graph = (node["@graph"] as Record<string, unknown>[]) ?? [node];
      for (const item of graph) {
        const type = item["@type"];
        const isProduct = Array.isArray(type)
          ? type.includes("Product")
          : type === "Product";
        if (!isProduct) continue;

        const offers = (Array.isArray(item.offers) ? item.offers[0] : item.offers) as
          | Record<string, unknown>
          | undefined;
        const image = Array.isArray(item.image) ? item.image[0] : item.image;
        return {
          name: typeof item.name === "string" ? item.name : undefined,
          image: typeof image === "string" ? image : undefined,
          description:
            typeof item.description === "string" ? item.description : undefined,
          price: offers?.price != null ? String(offers.price) : undefined,
          currency:
            typeof offers?.priceCurrency === "string"
              ? offers.priceCurrency
              : undefined,
        };
      }
    }
  }
  return {};
}

function parsePence(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.,]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const amount = Number.parseFloat(cleaned.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100);
}

export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
  const { html, finalUrl } = await fetchHtml(rawUrl);
  const ld = fromJsonLd(html);

  const title =
    ld.name ??
    meta(html, "og:title", "twitter:title") ??
    decodeEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "") ??
    null;

  const image = ld.image ?? meta(html, "og:image", "og:image:url", "twitter:image");

  const price =
    ld.price ??
    meta(
      html,
      "product:price:amount",
      "og:price:amount",
      "twitter:data1",
      "price"
    );

  const currency =
    ld.currency ??
    meta(html, "product:price:currency", "og:price:currency") ??
    "GBP";

  const description =
    ld.description ?? meta(html, "og:description", "description", "twitter:description");
  const siteName = meta(html, "og:site_name");

  return {
    url: finalUrl,
    title: title ? plainDashes(title) : null,
    description: description ? plainDashes(description) : null,
    // Resolve relative image paths against the page they came from.
    imageUrl: image ? new URL(image, finalUrl).toString() : null,
    pricePence: parsePence(price),
    currency: currency.toUpperCase().slice(0, 3),
    siteName: siteName ? plainDashes(siteName) : null,
  };
}
