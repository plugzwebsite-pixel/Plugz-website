import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pluggzofficial.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/creator/",
          // Affiliate redirects: there is nothing to index at a /go link, and
          // letting crawlers follow them would inflate creators' click counts
          // with traffic that was never a shopper.
          "/go/",
          "/login",
          "/signup",
          "/reset-password",
          "/forgot-password",
          "/verify-email",
          "/dev/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
