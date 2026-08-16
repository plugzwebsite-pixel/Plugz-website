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
  "connect-src 'self' https://cloudflareinsights.com" +
    (isProd ? "" : " ws: http://localhost:*"),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework or its version.
  poweredByHeader: false,

  // PM2 runs four workers, and each one kept its own in-memory copy of the
  // cache. Revalidating a tag reached the worker that handled the request and
  // left the other three serving the old page, so an admin edit appeared on
  // some refreshes and not others. With the memory layer off, every worker
  // reads the cache on disk and they all see the same invalidation.
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
