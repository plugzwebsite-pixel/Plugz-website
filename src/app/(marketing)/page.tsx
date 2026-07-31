import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Hero } from "@/components/marketing/hero";
import { TrendMarquee } from "@/components/marketing/trend-marquee";
import { SectionHeading } from "@/components/marketing/section";
import { CreatorCard, ProductCard } from "@/components/marketing/cards";
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
  const featured = CREATORS.slice(0, 8);
  const trendProducts = PRODUCTS.slice(0, 4);
  const trendingCreators = CREATORS.filter((c) => c.trending).slice(0, 7);

  return (
    <>
      <Hero />

      <Container>
        <TrendMarquee />
      </Container>

      {/* Featured creators */}
      <Container className="py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Handpicked"
            title="Featured creators"
            action={{ label: "Browse all", href: "/creators" }}
          />
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c, i) => (
            <Reveal key={c.handle} index={i % 4}>
              <CreatorCard creator={c} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Featured partner */}
      <Container className="py-6">
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

      {/* Trend of the week */}
      <Container className="py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Trend of the week"
            title="The holiday edit everyone's shopping"
            action={{ label: "See the edit", href: "/category/travel-holiday" }}
          />
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trendProducts.map((p, i) => (
            <Reveal key={p.name} index={i % 4}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Shop by lifestyle */}
      <Container className="py-10">
        <Reveal>
          <SectionHeading eyebrow="Curated" title="Shop by lifestyle" />
        </Reveal>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_NAV.map((c, i) => (
            <Reveal key={c.slug} index={i % 3}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex items-center gap-4 rounded-md border border-border bg-surface p-5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span className="grid h-14 w-14 place-items-center rounded-md bg-surface-2 text-2xl">
                  {c.emoji}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-text-strong">
                    {c.name}
                  </h3>
                  <p className="text-sm text-text-faint">{c.edits} edits</p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-text-faint transition-transform group-hover:translate-x-1 group-hover:text-brand-pink"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Trending creators strip */}
      <Container className="py-16">
        <Reveal>
          <SectionHeading eyebrow="Glowing = trending this week" title="Creators trending now" />
        </Reveal>
        <div className="mt-9 flex flex-wrap gap-8">
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

      {/* Commission CTA */}
      <Container className="py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg bg-grad-brand p-12 text-center sm:p-16">
            <div className="relative z-10 mx-auto max-w-2xl">
              <Sparkles className="mx-auto text-white" size={30} />
              <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-white">
                Your taste is worth commission.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/90">
                Turn the products you already recommend into income. Creators earn
                8% on every sale — we handle the links, tracking and payouts.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full border-white/30 bg-white text-[#17131a] hover:bg-white/90 sm:w-auto"
                  >
                    Join as Creator
                  </Button>
                </Link>
                <Link href="/waitlist">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-white/40 text-white hover:bg-white/10 sm:w-auto"
                  >
                    Join the shopper waitlist
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
