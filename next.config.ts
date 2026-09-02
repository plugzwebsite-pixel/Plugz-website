import type { NextConfig } from "next";
import { OPTIMISED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * 'unsafe-inline' on scripts is required by Next's inlined bootstrap and the
 * pre-paint theme script; using nonces instead would force every page to be
 * dynamic. Styles are inline because Tailwind injects them. Everything else is
 * locked to this origin. The only third party allowed is Cloudflare's own
 * analytics beacon, which it injects into every page it proxies for us.
 */
const csp = [
  "default-src 'self'",
  // Cloudflare injects its own analytics beacon into every proxied page. It is
  // cookieless and sends only page timings, but our own policy was blocking it,
  // which left a CSP violation in the console of every visit. The first thing
  // anyone technical sees when they open dev tools.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com" +
    (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  // Creator video is hosted by Cloudflare Stream and played in their iframe.
  // Without this, frame-src falls back to default-src 'self' and the player is
  // blocked with nothing on the page to say why.
  //
  // The host has to be written as a whole leading wildcard. Stream serves each
  // account from customer-<code>.cloudflarestream.com, and the obvious way to
  // say that, customer-*.cloudflarestream.com, is not valid CSP: a wildcard may
  // only stand for an entire label, never part of one. Browsers do not fail
  // loudly on that. They drop the whole directive and carry on, so the player
  // would have been blocked the day the first video went up, with only a line
  // in the console to say why.
  "frame-src 'self' https://iframe.videodelivery.net https://*.cloudflarestream.com",
  // A creator's file is uploaded straight from their browser to Cloudflare, so
  // the upload hosts have to be reachable or every video fails at 0%. Stream
  // hands back a one time address on either host, so both are allowed.
  "connect-src 'self' https://cloudflareinsights.com " +
    "https://upload.videodelivery.net https://*.cloudflarestream.com" +
    (isProd ? "" : " ws: http://localhost:*"),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework or its version.
  poweredByHeader: false,

  // The four PM2 workers share one cache, in Redis, rather than each keeping
  // their own. Without this, revalidating reached whichever worker handled the
  // request and left the other three serving the old page.
  //
  // The memory layer stays off, which is what Next's own guidance pairs with a
  // custom handler: an in-process copy sits in front of the shared one and
  // brings back exactly the inconsistency the shared one exists to remove.
  cacheHandler: require.resolve("./cache-handler.js"),
  cacheMaxMemorySize: 0,

  // Required at runtime rather than bundled. ioredis resolves its own
  // dependencies dynamically, which the bundler can't follow, so bundling it
  // leaves a client that throws on construction, and the rate limiter then
  // quietly falls back to in-memory counters.
  serverExternalPackages: ["ioredis"],

  images: {
    // Named hosts only. See src/lib/image-hosts.ts for why this isn't a
    // wildcard. A brand's own photography runs to a megabyte an image, which
    // is fine to fetch once and resize, and ruinous to serve to shoppers whole.
    remotePatterns: OPTIMISED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  async redirects() {
    // The dev mailbox captures verification and reset links locally. It must
    // not exist in production, where those emails are genuinely sent.
    return isProd
      ? [{ source: "/dev/:path*", destination: "/", permanent: false }]
      : [];
  },
};

export default nextConfig;
