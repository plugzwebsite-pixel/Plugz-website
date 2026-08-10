import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { SectionHeading } from "@/components/marketing/section";
import { ProductCard } from "@/components/marketing/cards";
import { CategoryVideoTile } from "@/components/marketing/category-video-tile";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { SmartImage } from "@/components/ui/smart-image";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { CATEGORY_NAV } from "@/lib/demo-data";
import {
  getCategoryCounts,
  getFeaturedBrand,
  getFeaturedCreators,
  getTrendingProducts,
  getPlatformStats,
} from "@/lib/queries";
import { compact, gbpFromPence } from "@/lib/utils";

/**
 * The homepage was fully dynamic, so every visitor waited on the trending
 * products, the creator wall, the platform counters and the featured brand
 * being queried again from scratch — about two seconds before anything
 * rendered. None of it changes minute to minute; a minute of cache is honest
 * for counters that only move when a shopper clicks.
 */
export const revalidate = 60;

export default async function HomePage() {
  const [trendProducts, featured, stats, featuredBrand, categoryCounts] =
    await Promise.all([
      getTrendingProducts(8),
      // The hero wall wants every creator it can get: each row has to span the
      // screen on its own, and a short list only loops back on itself.
      getFeaturedCreators(24),
      getPlatformStats(),
      getFeaturedBrand(),
      getCategoryCounts(),
    ]);
  const trendingCreators = featured.slice(0, 7);

  // Counted from the database — no invented figures on a page that is
  // recruiting real creators.
  const heroStats = [
    { value: String(stats.creators), label: "UK creators live" },
    { value: String(stats.listings), label: "Products plugged" },
    { value: String(stats.brands), label: "Brands onboard" },
  ];

  const impactStats = [
    { value: compact(stats.clicks), label: "shoppers sent to brands" },
    { value: String(stats.brands), label: "brand partners" },
    {
      value: stats.creatorCommissionPence
        ? gbpFromPence(stats.creatorCommissionPence)
        : "—",
      label: "creator commission earned",
    },
    {
      value: stats.averageRating ? `${stats.averageRating.toFixed(1)}★` : "—",
      label: "average creator rating",
    },
  ];

  return (
    <>
      <Hero
        creators={featured}
        stats={heroStats}
        creatorCount={stats.creators}
      />

      {/* Trending now — moved high up so shoppers hit the hot picks fast */}
      <Container className="py-14">
        <Reveal>
          <SectionHeading
            eyebrow="Trending now"
            title="What everyone's shopping this week"
            action={{ label: "See the edit", href: "/category/travel-holiday" }}
          />
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trendProducts.map((p, i) => (
            <Reveal key={`${p.creatorHandle}-${p.slug}`} index={i % 4}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Shop by lifestyle — Instagram-style hover-to-play video tiles */}
      <Container className="py-10">
        <Reveal>
          <SectionHeading eyebrow="Curated" title="Shop by lifestyle" />
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_NAV.map((c, i) => (
            <Reveal key={c.slug} index={i % 3}>
              <CategoryVideoTile category={c} count={categoryCounts.get(c.name) ?? 0} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Featured partner — the brand, the product and the picture all come
          from the catalogue, so the panel can't outlive what it advertises. */}
      {featuredBrand && (
      <Container className="py-14">
        <Reveal>
          <div className="relative grid overflow-hidden rounded-lg border border-border-strong lg:grid-cols-2">
            <div className="relative p-8 sm:p-12 lg:p-14">
              <Aurora intensity="strong" className="opacity-70" />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "var(--hero-veil)" }}
              />
              <div className="relative">
                <Eyebrow>Featured partner</Eyebrow>
                <h3 className="mt-3 font-display text-4xl font-semibold text-text-strong">
                  {featuredBrand.brandName}
                </h3>
                <p className="mt-1 text-lg text-text">
                  {featuredBrand.productName}
                  {featuredBrand.pricePence !== null &&
                    ` — ${gbpFromPence(featuredBrand.pricePence)}`}
                </p>
                <p className="mt-4 max-w-md leading-relaxed text-text-muted">
                  {featuredBrand.productCount > 1
                    ? `${featuredBrand.productCount} pieces from ${featuredBrand.brandName} are plugged by Pluggz creators. This one leads the ${featuredBrand.category.toLowerCase()} edit.`
                    : `Plugged by a Pluggz creator, and leading the ${featuredBrand.category.toLowerCase()} edit this week.`}
                </p>
                <Link href={featuredBrand.href} className="mt-7 inline-block">
                  <Button size="lg">
                    {/* Not every listing has been written up yet, and the panel
                        must not send a shopper to read a review nobody wrote. */}
                    {featuredBrand.hasReview ? "Read the review" : "See the piece"}{" "}
                    <ArrowRight size={17} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative min-h-64 lg:min-h-full">
              <SmartImage
                src={featuredBrand.imageUrl}
                alt={`${featuredBrand.productName} by ${featuredBrand.brandName}`}
                width={900}
                height={900}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[color:var(--bg)] lg:via-transparent lg:to-transparent"
              />
            </div>
          </div>
        </Reveal>
      </Container>
      )}

      {/* Trending creators strip */}
      <Container className="py-14">
        <Reveal>
          <SectionHeading
            eyebrow="Glowing = trending this week"
            title="Creators to follow"
          />
        </Reveal>
        <div className="mt-9 flex flex-wrap justify-center gap-8 sm:justify-start">
          {trendingCreators.map((c, i) => (
            <Reveal key={c.handle} index={i % 7}>
              <Link
                href={`/@${c.handle}`}
                className="group flex w-24 flex-col items-center text-center"
              >
                <Avatar name={c.name} src={c.avatarUrl ?? undefined} size="xl" ring />
                <p className="mt-3 text-sm font-medium text-text-strong">
                  {c.name.split(" ")[0]}
                </p>
                <p className="text-xs text-text-faint">
                  {c.followers > 0 ? `${compact(c.followers)} followers` : ""}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Impact stats */}
      <Container className="py-10">
        <Reveal>
          <div className="grid gap-6 rounded-lg border border-border bg-bg-elev p-10 sm:grid-cols-4">
            {impactStats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl font-semibold text-gradient">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>

      {/* Consumer closing CTA */}
      <Container className="py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg bg-grad-brand p-12 text-center sm:p-16">
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-white">
                Find your next favourite.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/90">
                Browse the creators redefining UK style — and shop the exact pieces
                they plug, straight from the brand.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/category/womens-fashion">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full border-white/30 bg-white text-[#17131a] hover:bg-white/90 sm:w-auto"
                  >
                    Explore the edit
                  </Button>
                </Link>
                <Link href="/search">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-white/40 text-white hover:bg-white/10 sm:w-auto"
                  >
                    Search Pluggz
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </>
  );
}
