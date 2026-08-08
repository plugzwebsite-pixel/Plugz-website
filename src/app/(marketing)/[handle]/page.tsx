import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, Share2, BadgeCheck } from "lucide-react";
import { Container, Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { compact } from "@/lib/utils";

function cleanHandle(raw: string) {
  return decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
}

const PLATFORM_ICON: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
};

// Served from cache and refreshed in the background. Shoppers arriving from a
// creator's post get a static page rather than a database round trip, and new
// products appear within the window below.
export const revalidate = 120;

/**
 * Prerender the storefronts that exist so they are served from the cache.
 *
 * A dynamic segment with no generateStaticParams is treated as fully dynamic
 * whatever `revalidate` says — Next was sending these pages as
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
  // so the metadata has to describe that outcome — otherwise every mistyped URL
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
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge tone="brand">{creator.category}</Badge>
                  <span className="text-sm text-text-faint">
                    {compact(creator.followers)} followers
                  </span>
                  <div className="flex items-center gap-2 text-text-muted">
                    {creator.socials.map((s) => {
                      const Icon = PLATFORM_ICON[s.platform];
                      if (!Icon || !s.url) return null;
                      return (
                        <a
                          key={s.platform}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          aria-label={s.platform}
                          className="transition-colors hover:text-brand-pink"
                        >
                          <Icon size={18} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">
                  <Heart size={15} /> Follow
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 size={15} /> Share
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <Container className="py-10">
        {products.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-20 text-center text-text-faint">
            {creator.name.split(" ")[0]} hasn&apos;t plugged anything yet. Check back
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
