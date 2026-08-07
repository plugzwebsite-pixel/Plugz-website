import "server-only";
import Redis from "ioredis";

/**
 * Fixed-window rate limiting, backed by Redis where it's available.
 *
 * Redis rather than process memory for two reasons: an in-memory counter is
 * wiped by every deploy and restart, so an attacker only has to wait for one,
 * and it can't be shared if the app ever runs as more than one process.
 * Without Redis configured (local development) it falls back to memory, which
 * is fine for a single developer but is not what production runs on.
 */

type Result = { ok: boolean; retryAfter: number };

let redis: Redis | null = null;
let redisDown = false;
let warned = false;

function client(): Redis | null {
  if (redisDown) return null;
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    // Say so once. Silently degrading to memory is how a limiter ends up
    // looking healthy while an attacker gets a fresh allowance on every deploy.
    if (!warned) {
      console.warn("[rate-limit] REDIS_URL not set — falling back to in-memory limits");
      warned = true;
    }
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      // Queue commands issued before the socket is ready rather than throwing.
      // With this off, the very first request after a deploy fails, and any
      // failure handling that treats that as "Redis is broken" then keeps the
      // limiter on in-memory counters for the life of the process.
      enableOfflineQueue: true,
      lazyConnect: false,
      connectTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    redis.on("error", (err) => {
      if (!redisDown) console.error("[rate-limit] redis error:", err.message);
      redisDown = true;
    });
    // Connections drop and come back. Clearing the flag on reconnect means a
    // brief blip costs a few requests of weaker limiting, not all of them.
    redis.on("ready", () => {
      if (redisDown) console.log("[rate-limit] redis recovered");
      redisDown = false;
    });
    return redis;
  } catch (err) {
    console.error("[rate-limit] could not create redis client:", err);
    redisDown = true;
    return null;
  }
}

// --- in-memory fallback -----------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }, 5 * 60_000).unref?.();
}

// --- public API -------------------------------------------------------------

export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000
): Promise<Result> {
  const r = client();
  if (!r) return memoryLimit(key, limit, windowMs);

  // Still connecting: count this one in memory rather than blocking the
  // request on a socket that isn't up yet.
  if (r.status !== "ready") return memoryLimit(key, limit, windowMs);

  try {
    const redisKey = `rl:${key}`;
    // INCR then EXPIRE on first hit: the window starts when the first request
    // in it arrives and is not extended by later ones.
    const count = await r.incr(redisKey);
    if (count === 1) {
      await r.pexpire(redisKey, windowMs);
    }
    if (count > limit) {
      const ttl = await r.pttl(redisKey);
      return { ok: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) };
    }
    return { ok: true, retryAfter: 0 };
  } catch (err) {
    // Fall back for this request only. A single failed command is not proof
    // that Redis is gone, and permanently giving up on it would silently
    // weaken every limit from then on — which is exactly the kind of thing
    // that looks fine until someone is brute-forcing logins.
    console.error(
      "[rate-limit] redis command failed, using memory for this request:",
      err instanceof Error ? err.message : err
    );
    return memoryLimit(key, limit, windowMs);
  }
}

/**
 * The caller's real IP.
 *
 * `X-Forwarded-For` cannot be trusted from the left: our own Nginx *appends*
 * the real address to whatever the client sent, so the first entry is
 * attacker-controlled and reading it lets anyone defeat rate limiting by
 * sending a different value on every request. `X-Real-IP` is overwritten by
 * Nginx and is authoritative; the last entry of the forwarded chain is the
 * next-best thing, because only our proxy can append to the end of it.
 */
export function clientIpFrom(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return "local";
}

export function clientKey(req: Request, scope: string): string {
  return `${scope}:${clientIpFrom(req.headers)}`;
}
