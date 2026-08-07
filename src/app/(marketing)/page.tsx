import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { SectionHeading } from "@/components/marketing/section";
import { ProductCard } from "@/components/marketing/cards";
import { CategoryVideoTile } from "@/components/marketing/category-video-tile";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { CATEGORY_NAV } from "@/lib/demo-data";
import {
  getFeaturedCreators,
  getTrendingProducts,
  getPlatformStats,
} from "@/lib/queries";
import { compact, gbpFromPence } from "@/lib/utils";

export default async function HomePage() {
  const [trendProducts, featured, stats] = await Promise.all([
    getTrendingProducts(8),
    getFeaturedCreators(12),
    getPlatformStats(),
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
              <CategoryVideoTile category={c} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Featured partner */}
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
                  Aura Rituals
                </h3>
                <p className="mt-1 text-lg text-text">
                  The Golden Hour Set — limited UK launch
                </p>
                <p className="mt-4 max-w-md leading-relaxed text-text-muted">
                  The peptide-glow ritual creators can&apos;t stop plugging, now
                  in one edit. Free next-day UK delivery this week only.
                </p>
                <Link href="/category/beauty-skincare" className="mt-7 inline-block">
                  <Button size="lg">
                    Shop the launch <ArrowRight size={17} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative min-h-64 lg:min-h-full">
              <Image
                src="/images/products/partner-aura.jpg"
                alt="Aura Rituals — The Golden Hour Set"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[color:var(--bg)] lg:via-transparent lg:to-transparent"
              />
            </div>
          </div>
        </Reveal>
      </Container>

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
                  {compact(c.followers)} followers
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
