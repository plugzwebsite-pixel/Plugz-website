import "server-only";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { clientIpFrom } from "@/lib/rate-limit";

/**
 * Pluggz's own affiliate link layer.
 *
 * The short code is generated once and is permanent. Creators publish
 * pluggz.com/go/<code> to Instagram and TikTok straight away, pointing at a
 * placeholder while the brand deal is still being agreed. When the real
 * affiliate URL arrives we swap only `destinationUrl`, so every link already out
 * in the world keeps working and keeps its click history.
 */

// No 0/1/l/i/o, because codes get read aloud and typed by hand.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_LENGTH = 8;

export const ATTRIBUTION_COOKIE = "pluggz_attr";

export function generateCode(length = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Reserve a code that isn't already taken. Collisions are vanishingly rare. */
export async function allocateCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const taken = await db.trackingLink.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  // Widen rather than fail. 10 chars makes a further collision implausible.
  return generateCode(CODE_LENGTH + 2);
}

/**
 * IPs are hashed with a server secret before storage. We need to count unique
 * visitors, not to be able to identify them.
 */
export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "pluggz";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * One shared definition of "the caller's IP", so click counting and rate
 * limiting can't disagree about who someone is. Reading the first entry of
 * X-Forwarded-For would take a value the client chose, which would let anyone
 * inflate a creator's unique-visitor count at will.
 */
export function clientIp(headers: Headers): string | null {
  const ip = clientIpFrom(headers);
  return ip === "local" ? null : ip;
}

/** Cheap bot filter so crawler hits don't inflate a creator's click count. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor|curl|wget|headless|lighthouse/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/**
 * Where the shopper actually gets sent.
 *
 * For a brand on a third-party network we rewrite through their deep-link
 * pattern so the network attributes the sale to Pluggz. For a direct deal
 * (every brand today) we send them straight to the destination with our own
 * click reference attached, which is what our postback reconciles against.
 */
export function buildDestination(
  destinationUrl: string,
  brand: {
    trackingMethod: string;
    deepLinkPattern: string | null;
    publisherId: string | null;
  } | null,
  clickRef: string
): string {
  if (brand?.trackingMethod === "NETWORK" && brand.deepLinkPattern) {
    return brand.deepLinkPattern
      .replace("{DEST}", encodeURIComponent(destinationUrl))
      .replace("{CLICKREF}", encodeURIComponent(clickRef))
      .replace("{PUBLISHER}", encodeURIComponent(brand.publisherId ?? ""));
  }

  try {
    const url = new URL(destinationUrl);
    url.searchParams.set("ref", "pluggz");
    url.searchParams.set("pz", clickRef);
    return url.toString();
  } catch {
    // Placeholder destinations may not be valid absolute URLs yet.
    return destinationUrl;
  }
}
