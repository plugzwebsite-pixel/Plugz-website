import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Container, Eyebrow, Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { Avatar } from "@/components/ui/avatar";
import { ProductImage } from "@/components/ui/product-image";
import { SmartImage } from "@/components/ui/smart-image";
import { campaignBySlug } from "@/lib/campaigns";
import { gbpFromPence } from "@/lib/utils";

/**
 * A campaign storefront.
 *
 * Several creators telling one story, which is the thing a brand actually buys
 * and which no single creator's storefront can hold. Every product here keeps
 * its own creator's tracking link, so a sale made from this page is attributed
 * exactly as it would be from that creator's own page. The campaign changes
 * how the work is presented, never who earned it.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await campaignBySlug(slug);
  if (!c) return { title: "Campaign" };
  return {
    title: c.name,
    description: c.tagline ?? c.description ?? undefined,
  };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await campaignBySlug(slug);
  if (!c) notFound();

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="soft" className="opacity-70" />
        {c.heroImageUrl && (
          <div className="absolute inset-0 -z-10">
            <SmartImage
              src={c.heroImageUrl}
              alt=""
              width={1600}
              height={600}
              priority
              className="h-full w-full object-cover opacity-25"
            />
          </div>
        )}
        <Container className="relative py-16">
          <Reveal>
            <Eyebrow>{c.brand ? `In partnership with ${c.brand.name}` : "Campaign"}</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-tight text-text-strong">
              {c.name}
            </h1>
            {c.tagline && (
              <p className="mt-3 max-w-xl text-lg text-text-muted">{c.tagline}</p>
            )}
            <p className="mt-4 text-sm text-text-faint">
              {c.creators.length} creator{c.creators.length === 1 ? "" : "s"} ·{" "}
              {c.listings.length} product{c.listings.length === 1 ? "" : "s"}
            </p>
            {c.endsAt && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-text-muted">
                <CalendarClock size={14} />
                {`Until ${c.endsAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}`}
              </p>
            )}
          </Reveal>
        </Container>
      </section>

      {c.description && (
        <Container className="py-10">
          <p className="max-w-2xl text-text-muted">{c.description}</p>
        </Container>
      )}

      {c.creators.length > 0 && (
        <Container className="pb-4">
          <h2 className="font-display text-xl font-semibold text-text-strong">
            The creators
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {c.creators.map((cr) => (
              <Link
                key={cr.handle}
                href={`/@${cr.handle}`}
                className="flex items-center gap-3 rounded-pill border border-border bg-surface px-4 py-2 transition-colors hover:border-border-strong"
              >
                <Avatar src={cr.avatarUrl ?? undefined} name={cr.name} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-strong">
                    {cr.name}
                  </span>
                  <span className="block truncate text-xs text-text-faint">
                    @{cr.handle}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      )}

      <Container className="py-10">
        <h2 className="font-display text-xl font-semibold text-text-strong">
          Everything in the edit
        </h2>

        {c.listings.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-border py-20 text-center text-text-faint">
            Nothing in this edit yet. Check back shortly.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.listings.map((p) => (
              <Link
                key={p.id}
                href={`/@${p.handle}/${p.slug}`}
                className="group rounded-md border border-border bg-surface p-3 transition-colors hover:border-border-strong"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-sm bg-surface-2">
                  <ProductImage
                    src={p.imageUrl}
                    alt={p.name}
                    width={400}
                    height={500}
                    seed={p.slug}
                    label={p.brandName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 truncate text-xs uppercase tracking-wide text-text-faint">
                  {p.brandName}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-text-strong">
                  {p.name}
                </p>
                <p className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-text">
                    {p.pricePence === null ? "Price at brand" : gbpFromPence(p.pricePence)}
                  </span>
                  <span className="truncate text-xs text-text-faint">@{p.handle}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </Container>

      <Container className="pb-16">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-strong"
        >
          All campaigns
          <ArrowRight size={14} />
        </Link>
      </Container>
    </>
  );
}
