import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow, Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { SmartImage } from "@/components/ui/smart-image";
import { ArtPanel } from "@/components/ui/art-panel";
import { liveCampaigns } from "@/lib/campaigns";

export const metadata: Metadata = {
  title: "Campaigns",
  description: "Edits built by several Pluggz creators together.",
};

export const revalidate = 300;

export default async function CampaignsPage() {
  const campaigns = await liveCampaigns();

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="soft" className="opacity-70" />
        <Container className="relative py-14">
          <Reveal>
            <Eyebrow>Campaigns</Eyebrow>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold text-text-strong">
              Edits built together
            </h1>
            <p className="mt-3 max-w-xl text-text-muted">
              Several creators, one story. Each product still links to the brand
              through the creator who chose it.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-12">
        {campaigns.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-20 text-center text-text-faint">
            No campaigns running right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Link
                key={c.slug}
                href={`/campaign/${c.slug}`}
                className="group overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-border-strong"
              >
                <div className="aspect-[16/9] overflow-hidden bg-surface-2">
                  {c.heroImageUrl ? (
                    <SmartImage
                      src={c.heroImageUrl}
                      alt=""
                      width={640}
                      height={360}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ArtPanel seed={c.slug} label={c.name} />
                  )}
                </div>
                <div className="p-5">
                  {c.brandName && (
                    <Badge tone="neutral">With {c.brandName}</Badge>
                  )}
                  <h2 className="mt-2 font-display text-lg font-semibold text-text-strong">
                    {c.name}
                  </h2>
                  {c.tagline && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">
                      {c.tagline}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-text-faint">
                    {c.creatorCount} creator{c.creatorCount === 1 ? "" : "s"} ·{" "}
                    {c.listingCount} product{c.listingCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
