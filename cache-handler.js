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
        if (entry.tags?.some((t) => list.includes(t))) memory.delete(key);
      }
      return;
    }

    try {
      for (const tag of list) {
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
