import Link from "next/link";
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
import {
  CREATORS,
  PRODUCTS,
  CATEGORY_NAV,
  IMPACT_STATS,
  creatorPhoto,
} from "@/lib/demo-data";
import { compact } from "@/lib/utils";

export default function HomePage() {
  const trendProducts = PRODUCTS.slice(0, 8);
  const trendingCreators = CREATORS.filter((c) => c.trending).slice(0, 7);

  return (
    <>
      <Hero />

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
            <Reveal key={`${p.name}-${i}`} index={i % 4}>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/products/partner-aura.jpg"
                alt="Aura Rituals — The Golden Hour Set"
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
                <Avatar name={c.name} src={creatorPhoto(c.handle)} size="xl" ring />
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
            {IMPACT_STATS.map((s) => (
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
