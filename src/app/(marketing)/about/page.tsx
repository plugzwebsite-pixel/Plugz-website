import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Search, Percent, ArrowRight } from "lucide-react";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Pluggz",
  description:
    "Pluggz is the UK's curated directory of creators and the products they genuinely plug. Discover here, buy at the brand.",
};

export const revalidate = 3600;

const howItWorks = [
  {
    icon: BadgeCheck,
    title: "Creators plug what they use",
    body: "Approved creators share the products genuinely in their rotation. Each one gets its own page with their review, their rating and their words, not a thumbnail in someone else's feed.",
  },
  {
    icon: Search,
    title: "Shoppers discover with confidence",
    body: "Browse the edit, read the review, then buy the exact piece straight from the brand's own site. Pluggz never sells you anything itself, so the review has nothing to sell.",
  },
  {
    icon: Percent,
    title: "Brands pay only when it works",
    body: "Every click is attributed to the creator who earned it. Commission is charged on completed sales only, never on clicks or impressions, and returns inside your own window come off automatically.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="medium" className="opacity-70" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--hero-veil)" }}
        />
        <Container className="relative py-16 text-center">
          <Reveal>
            <Eyebrow>About Pluggz</Eyebrow>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.05] text-text-strong">
              Recommendations{" "}
              <span className="text-gradient italic">worth shopping.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              Pluggz is the UK&apos;s curated directory of creators and the
              products they genuinely plug. No feeds, no noise, no sponsored
              slots pretending to be taste. Every recommendation gets its own
              page, with a named creator&apos;s review, rating and photos, and
              every click is tracked back to the creator who earned it.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-14">
        <Reveal>
          <div className="mx-auto max-w-3xl space-y-7">
            {howItWorks.map((p) => (
              <div key={p.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-brand-pink">
                  <p.icon size={19} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-text-strong">
                    {p.title}
                  </h2>
                  <p className="mt-1.5 leading-relaxed text-text-muted">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>

      <section className="border-y border-border bg-bg-elev">
        <Container className="py-14">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Why Pluggz exists</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3.5vw,2.4rem)] font-semibold leading-tight text-text-strong">
                Affiliate marketing had a trust problem.
              </h2>
              <div className="mt-5 space-y-4 leading-relaxed text-text-muted">
                <p>
                  Recommendations drive most of what gets bought online, but
                  the economics behind them are usually invisible. A link looks
                  like a tip and behaves like an advert, and nobody tells you
                  which one it is.
                </p>
                <p>
                  Pluggz was built to make the recommendation the whole point:
                  a named person, a real review, and tracking that credits them
                  openly when it leads to a sale. The creator gets paid for
                  their taste, the brand pays for results, and the shopper knows
                  exactly what they are looking at.
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <Container className="py-14">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-text-muted">
              Pluggz is operated by CEO Live Ltd.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contact">
                <Button size="lg">
                  Get in touch <ArrowRight size={17} />
                </Button>
              </Link>
              <Link href="/brands">
                <Button size="lg" variant="outline">
                  Partner with us
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </>
  );
}
