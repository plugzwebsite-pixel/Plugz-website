import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publiclyVisibleCreator } from "@/lib/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Star, Ticket, BadgeCheck } from "lucide-react";
import { Container, Badge, Eyebrow } from "@/components/ui/primitives";
import { ArtPanel } from "@/components/ui/art-panel";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/marketing/cards";
import { Reveal } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";
import { getCreatorProduct, getSimilarProducts } from "@/lib/queries";
import { compact, gbpFromPence } from "@/lib/utils";

/**
 * The Pluggz product page.
 *
 * This is the page a shopper lands on when they follow a creator's link from
 * Instagram or TikTok — deliberately not the brand's site. They read the
 * creator's review here first, and only Buy Now sends them out, through the
 * tracked /go redirect.
 */

function cleanHandle(raw: string) {
  return decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
}

// Served from cache and refreshed in the background. Shoppers arriving from a
// creator's post get a static page rather than a database round trip, and new
// products appear within the window below.
export const revalidate = 120;

/**
 * Product pages get the same treatment as the storefronts above: without this
 * they are rendered fresh, uncached, for every shopper who taps a creator's
 * link. New listings still render on demand.
 */
export async function generateStaticParams() {
  const listings = await db.creatorProduct.findMany({
    where: { live: true, profile: publiclyVisibleCreator },
    select: { slug: true, profile: { select: { handle: true } } },
  });
  return listings.map((l) => ({ handle: `@${l.profile.handle}`, product: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; product: string }>;
}): Promise<Metadata> {
  const { handle, product } = await params;
  const row = await getCreatorProduct(cleanHandle(handle), product);
  if (!row) {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${row.product.name} — ${row.creator.name}`,
    description:
      row.review ?? row.product.description ?? `${row.product.name} by ${row.product.brand.name}`,
    openGraph: {
      title: `${row.product.name} — plugged by ${row.creator.name}`,
      images: row.product.imageUrl ? [row.product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string; product: string }>;
}) {
  const { handle, product: slug } = await params;
  const row = await getCreatorProduct(cleanHandle(handle), slug);
  if (!row) notFound();

  const { product, creator, trackingLink, alsoPluggedBy } = row;
  const similar = await getSimilarProducts(product.category, slug);
  const buyHref = trackingLink ? `/go/${trackingLink.code}` : product.brand.websiteUrl ?? "#";

  return (
    <>
      <Container className="py-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Image */}
          <Reveal>
            <div className="relative overflow-hidden rounded-lg border border-border bg-surface-2">
              {product.imageUrl ? (
                <SmartImage
                  src={product.imageUrl}
                  alt={product.name}
                  width={800}
                  height={800}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  // Above the fold and the largest thing on the page, so it
                  // shouldn't wait its turn behind lazy images.
                  priority
                  // Whatever shape the brand shot is, show all of it. This is
                  // the image the shopper decides on — cropping it to a square
                  // is how you cut the product in half.
                  className="aspect-square w-full object-contain p-6"
                />
              ) : (
                <>
                  <div className="aspect-square w-full" />
                  <ArtPanel seed={`${product.brand.slug}-${slug}`} label={product.brand.name} />
                </>
              )}
            </div>
            {row.videoUrl && (
              <video
                src={row.videoUrl}
                controls
                playsInline
                className="mt-4 w-full rounded-lg border border-border"
              />
            )}
          </Reveal>

          {/* Detail */}
          <Reveal index={1}>
            <div className="flex h-full flex-col">
              <Eyebrow>{product.brand.name}</Eyebrow>
              <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.8rem)] font-semibold leading-tight text-text-strong">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-semibold text-text-strong">
                  {product.pricePence === null ? "—" : gbpFromPence(product.pricePence)}
                </span>
                <Badge tone="neutral">{product.category}</Badge>
                {trackingLink && trackingLink.clickCount > 0 && (
                  <span className="text-sm text-text-faint">
                    {compact(trackingLink.clickCount)} shoppers clicked through
                  </span>
                )}
              </div>

              {product.description && (
                <p className="mt-5 leading-relaxed text-text-muted">
                  {product.description}
                </p>
              )}

              {/* Creator's review — the reason this page exists */}
              <div className="mt-7 rounded-md border border-border bg-surface p-5">
                <Link
                  href={`/@${creator.handle}`}
                  className="group flex items-center gap-3"
                >
                  <Avatar
                    name={creator.name}
                    src={creator.avatarUrl ?? undefined}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text-strong group-hover:text-brand-pink">
                        {creator.name}
                      </span>
                      <BadgeCheck size={15} className="text-brand-pink" />
                    </div>
                    <p className="text-xs text-text-faint">
                      @{creator.handle} · {compact(creator.followers)} followers
                    </p>
                  </div>
                </Link>

                {row.rating !== null && (
                  <div className="mt-4 flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < row.rating!
                            ? "fill-accent-gold text-accent-gold"
                            : "text-text-faint"
                        }
                      />
                    ))}
                  </div>
                )}

                {row.review && (
                  <p className="mt-3 leading-relaxed text-text">
                    &ldquo;{row.review}&rdquo;
                  </p>
                )}
              </div>

              {trackingLink?.discountCode && (
                <div className="mt-4 flex items-center gap-3 rounded-md border border-brand-pink/25 bg-brand-pink/[0.05] p-4">
                  <Ticket size={18} className="shrink-0 text-brand-pink" />
                  <div>
                    <p className="text-sm text-text-muted">
                      Use {creator.name.split(" ")[0]}&apos;s code at checkout
                    </p>
                    <p className="font-display text-lg font-semibold tracking-wide text-text-strong">
                      {trackingLink.discountCode}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-7">
                <a href={buyHref} rel="nofollow sponsored">
                  <Button size="lg" className="w-full sm:w-auto">
                    Buy at {product.brand.name} <ArrowUpRight size={17} />
                  </Button>
                </a>
                <p className="mt-2.5 text-xs text-text-faint">
                  You&apos;ll finish your purchase on {product.brand.name}&apos;s own
                  site. Pluggz may earn a commission.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* The payoff of one shared master product record */}
        {alsoPluggedBy.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-xl font-semibold text-text-strong">
              Also plugged by
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {alsoPluggedBy.map((other) => (
                <Link
                  key={other.profile.handle}
                  href={`/@${other.profile.handle}/${other.slug}`}
                  className="flex items-center gap-3 rounded-pill border border-border bg-surface py-2 pl-2 pr-5 transition-colors hover:border-border-strong"
                >
                  <Avatar
                    name={other.profile.user.name}
                    src={other.profile.avatarUrl ?? undefined}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-strong">
                      {other.profile.user.name}
                    </p>
                    <p className="text-xs text-text-faint">
                      @{other.profile.handle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {similar.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-xl font-semibold text-text-strong">
              More in {product.category}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((p, i) => (
                <Reveal key={`${p.creatorHandle}-${p.slug}`} index={i % 4}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
