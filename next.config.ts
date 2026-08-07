import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * 'unsafe-inline' on scripts is required by Next's inlined bootstrap and the
 * pre-paint theme script; using nonces instead would force every page to be
 * dynamic. Styles are inline because Tailwind injects them. Everything else is
 * locked to this origin — the platform loads no third-party scripts at all.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self'" + (isProd ? "" : " ws: http://localhost:*"),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Don't advertise the framework or its version.
  poweredByHeader: false,

  // Required at runtime rather than bundled. ioredis resolves its own
  // dependencies dynamically, which the bundler can't follow — bundling it
  // leaves a client that throws on construction, and the rate limiter then
  // quietly falls back to in-memory counters.
  serverExternalPackages: ["ioredis"],

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
