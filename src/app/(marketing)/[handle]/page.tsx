import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Container, Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { ProductCard } from "@/components/marketing/cards";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";
import { getCreatorByHandle, getProductsForCreator, publiclyVisibleCreator } from "@/lib/queries";
import { db } from "@/lib/db";
import { compact, shortName } from "@/lib/utils";
import { normalisePlatform, profileUrl } from "@/lib/validation";
import { CreatorActions } from "@/components/storefront/creator-actions";

function cleanHandle(raw: string) {
  return decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
}

const PLATFORM_ICON: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
};

/** What to call each one when the following is not known. */
const PLATFORM_NAME: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

// Served from cache and refreshed in the background. Shoppers arriving from a
// creator's post get a static page rather than a database round trip, and new
// products appear within the window below.
export const revalidate = 120;

/**
 * Prerender the storefronts that exist so they are served from the cache.
 *
 * A dynamic segment with no generateStaticParams is treated as fully dynamic
 * whatever `revalidate` says. Next was sending these pages as
 * `private, no-store`, so neither the browser nor the CDN could ever hold one.
 * These are the pages a shopper lands on from Instagram, so that was the worst
 * possible route to leave uncacheable. Handles added later still render on
 * demand and join the cache on first request.
 */
export async function generateStaticParams() {
  const creators = await db.creatorProfile.findMany({
    where: publiclyVisibleCreator,
    select: { handle: true },
  });
  return creators.map(({ handle }) => ({ handle: `@${handle}` }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const creator = await getCreatorByHandle(cleanHandle(handle));

  // Any unmatched top-level path lands here before falling through to the 404,
  // so the metadata has to describe that outcome, or every mistyped URL
  // is titled "Storefront", in the browser tab and in search results.
  if (!creator) {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }

  return {
    title: `${creator.name} (@${creator.handle})`,
    description: creator.tag,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const slug = cleanHandle(handle);

  const creator = await getCreatorByHandle(slug);
  if (!creator) notFound();

  const products = await getProductsForCreator(slug);

  // Group by category so the page reads as curated collections rather than a
  // flat product list.
  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="medium" className="opacity-70" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--hero-veil)" }}
        />
        <Container className="relative py-14">
          <Reveal>
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar
                name={creator.name}
                src={creator.avatarUrl ?? undefined}
                size="xl"
                ring
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-4xl font-semibold text-text-strong">
                    {creator.name}
                  </h1>
                  <BadgeCheck className="text-brand-pink" size={22} />
                </div>
                <p className="mt-1 text-text-muted">@{creator.handle}</p>
                <p className="mt-3 max-w-md text-text">{creator.tag}</p>
                {/* Where a creator's own audience is shown, which is the thing
                    that makes a storefront look like somebody rather than a
                    page. Each platform is its own link out to the real
                    account, with the following where we know it. */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{creator.category}</Badge>
                  {creator.socials.map((s) => {
                    const platform = normalisePlatform(s.platform);
                    const Icon = PLATFORM_ICON[platform];
                    // Rows written before the handle was tidied carry no url,
                    // so one is worked out from the handle rather than the link
                    // being dropped, which is what used to happen.
                    const href = s.url || profileUrl(platform, s.handle);
                    if (!Icon || !href) return null;
                    const clean = s.handle.replace(/^@/, "");
                    return (
                      <a
                        key={`${platform}-${clean}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={`@${clean} on ${PLATFORM_NAME[platform] ?? platform}`}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-2 px-3 py-1 text-sm text-text-muted transition-colors hover:border-brand-pink hover:text-text-strong"
                      >
                        <Icon size={15} />
                        {s.followers > 0
                          ? compact(s.followers)
                          : (PLATFORM_NAME[platform] ?? platform)}
                      </a>
                    );
                  })}
                </div>
              </div>
              <CreatorActions handle={creator.handle} name={creator.name} />
            </div>
          </Reveal>
        </Container>
      </section>

      <Container className="py-10">
        {products.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-20 text-center text-text-faint">
            {shortName(creator.name)} hasn&apos;t plugged anything yet. Check back
            soon.
          </p>
        ) : (
          <div className="space-y-12">
            {[...byCategory.entries()].map(([category, items]) => (
              <div key={category}>
                <h2 className="font-display text-2xl font-semibold text-text-strong">
                  {category}
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map((p, i) => (
                    <Reveal key={p.slug} index={i % 4}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
