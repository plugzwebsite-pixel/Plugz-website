// Next's incremental cache, kept in Redis instead of on this machine's disk.
//
// Four workers run behind PM2 and each one used to keep its own copy in
// memory, so revalidating reached whichever worker handled the request and
// left the other three serving the old page. Turning the memory layer off
// fixed that by sending everyone to the shared disk cache, which worked but
// pays a disk read for every cache hit and starts cold after every deploy,
// since a release wipes .next.
//
// Redis is already here for rate limiting. Putting the cache there as well
// makes the four workers share one copy, survives a release, and would still
// be correct if this ever ran on more than one machine.
//
// Two things this has to get right, and both are easy to get wrong:
//
//   1. A page entry holds a Buffer (rscData) and a Map of Buffers
//      (segmentData). JSON.stringify quietly destroys both, which is what most
//      hand-written handlers do; the page still renders but its flight data is
//      corrupt. v8.serialize handles them losslessly, so values go to Redis as
//      binary rather than text.
//
//   2. Every key is namespaced by the build. Without that, the first request
//      after a release can be answered with a page rendered by the previous
//      one, which is a far worse failure than a cold cache.

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { serialize, deserialize } = require("node:v8");

const TTL_SECONDS = 60 * 60 * 24 * 7;

/** The build this process is serving. Falls back to a constant in dev. */
function buildId() {
  try {
    return readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return "development";
  }
}

const NAMESPACE = `pluggz:isr:${buildId()}`;
const entryKey = (key) => `${NAMESPACE}:e:${key}`;
const tagKey = (tag) => `${NAMESPACE}:t:${tag}`;

// --- the connection ---------------------------------------------------------

let redis = null;
let down = false;
let warned = false;

function client() {
  if (down) return null;
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warned) {
      console.warn("[cache] REDIS_URL not set, caching in this process only");
      warned = true;
    }
    return null;
  }

  try {
    const Redis = require("ioredis");
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      connectTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    redis.on("error", (err) => {
      if (!down) console.error("[cache] redis error:", err.message);
      down = true;
    });
    redis.on("ready", () => {
      if (down) console.log("[cache] redis recovered");
      down = false;
    });
    return redis;
  } catch (err) {
    console.error("[cache] could not create redis client:", err.message);
    down = true;
    return null;
  }
}

// --- revalidatePath ----------------------------------------------------------
//
// `revalidateTag` receives two kinds of tag and they need answering differently.
//
// A tag the application wrote, like "categories", was recorded against its
// entries when they were stored, so the index built in `set` finds them.
//
// A tag Next invented for `revalidatePath` was not. Next tracks those as *soft*
// tags, which it keeps to itself and never passes to a cache handler, so there
// is no index to look in. Ignoring them, which is what this did at first, makes
// `revalidatePath` do nothing at all: the team edits a category, refreshes, and
// sees the old page. Since the entry key *is* the path, the answer is to match
// on the key rather than look anything up.

const IMPLICIT = "_N_T_";

/** Redis glob metacharacters, so a literal path cannot become a pattern. */
function escapeGlob(s) {
  return s.replace(/([[\]?*^\\])/g, "\\$1");
}

/**
 * The key patterns a `_N_T_` tag should clear, or null if this is a real tag.
 *
 *   _N_T_/sitemap.xml      one page
 *   _N_T_/category/[slug]  every page of a dynamic route
 *   _N_T_/layout           that layout and everything below it
 *   _N_T_/                 the root layout, so the whole site
 */
function pathPatternsFor(tag) {
  if (!tag.startsWith(IMPLICIT)) return null;
  let path = tag.slice(IMPLICIT.length) || "/";

  if (path.endsWith("/layout")) path = path.slice(0, -"/layout".length) || "/";

  // A route pattern rather than a path: clear everything under the part that
  // is literal. `revalidatePath("/category/[slug]", "page")` has to reach
  // /category/home and /category/christmas-edit, which share only that prefix.
  const dynamic = path.indexOf("[");
  if (dynamic !== -1) {
    return [`${escapeGlob(path.slice(0, dynamic))}*`];
  }

  if (path === "/") return ["*"];

  // The page itself, and anything nested below it.
  return [escapeGlob(path), `${escapeGlob(path)}/*`];
}

/** Does this key fall under the path a `_N_T_` tag names? For the fallback. */
function matchesPath(tag, key) {
  const patterns = pathPatternsFor(tag);
  if (!patterns) return false;
  return patterns.some((p) => {
    if (p === "*") return true;
    const bare = p.replace(/\\(.)/g, "$1");
    return bare.endsWith("*") ? key.startsWith(bare.slice(0, -1)) : key === bare;
  });
}

/**
 * Every key matching a pattern.
 *
 * SCAN rather than KEYS: KEYS blocks the server for the length of the scan, and
 * this Redis also carries the rate limiter, which every request touches.
 */
async function scanKeys(r, pattern) {
  const found = [];
  let cursor = "0";
  do {
    const [next, batch] = await r.scan(cursor, "MATCH", pattern, "COUNT", 500);
    cursor = next;
    found.push(...batch);
  } while (cursor !== "0");
  return found;
}

// --- the fallback -----------------------------------------------------------
//
// Local development, and the seconds after a Redis blip. A miss is always
// safe: Next simply renders the page. Never throw from here, because an error
// in the cache would become an error on the page.

const memory = new Map();

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    const r = client();
    if (!r) return memory.get(key) ?? null;

    try {
      const buf = await r.getBuffer(entryKey(key));
      return buf ? deserialize(buf) : null;
    } catch (err) {
      if (!down) console.error("[cache] get failed:", err.message);
      return null; // a miss, never an error
    }
  }

  async set(key, data, ctx) {
    const entry = {
      value: data,
      lastModified: Date.now(),
      tags: ctx?.tags ?? [],
    };

    const r = client();
    if (!r) {
      memory.set(key, entry);
      return;
    }

    try {
      const pipeline = r.pipeline();
      pipeline.set(entryKey(key), serialize(entry), "EX", TTL_SECONDS);

      // An index per tag, so revalidating one does not mean reading every key
      // in the database to find out which ones carried it.
      for (const tag of entry.tags) {
        pipeline.sadd(tagKey(tag), key);
        pipeline.expire(tagKey(tag), TTL_SECONDS);
      }

      await pipeline.exec();
    } catch (err) {
      if (!down) console.error("[cache] set failed:", err.message);
      // Losing a write means the next request renders the page again. Fine.
    }
  }

  async revalidateTag(tags) {
    const list = [tags].flat().filter(Boolean);
    if (list.length === 0) return;

    const r = client();
    if (!r) {
      for (const [key, entry] of memory) {
        if (entry.tags?.some((t) => list.includes(t)) || list.some((t) => matchesPath(t, key))) {
          memory.delete(key);
        }
      }
      return;
    }

    try {
      for (const tag of list) {
        // Two quite different kinds of tag arrive here.
        const paths = pathPatternsFor(tag);
        if (paths) {
          for (const pattern of paths) {
            const found = await scanKeys(r, `${NAMESPACE}:e:${pattern}`);
            if (found.length === 0) continue;
            const pipeline = r.pipeline();
            for (const full of found) pipeline.del(full);
            await pipeline.exec();
          }
          continue;
        }

        const keys = await r.smembers(tagKey(tag));
        const pipeline = r.pipeline();
        for (const key of keys) pipeline.del(entryKey(key));
        pipeline.del(tagKey(tag));
        await pipeline.exec();
      }
    } catch (err) {
      if (!down) console.error("[cache] revalidateTag failed:", err.message);
      // Worth being loud about: a revalidation that silently did nothing is
      // the team editing something and not seeing it change.
    }
  }

  resetRequestCache() {
    // Nothing is held per request here.
  }
};
