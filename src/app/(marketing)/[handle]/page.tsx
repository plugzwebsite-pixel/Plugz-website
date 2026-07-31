import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, Share2, BadgeCheck } from "lucide-react";
import { Container, Badge, Pill } from "@/components/ui/primitives";
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
import {
  creatorByHandle,
  productsForCreator,
  creatorPhoto,
  PRODUCTS,
} from "@/lib/demo-data";
import { compact } from "@/lib/utils";

function cleanHandle(raw: string) {
  return decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const creator = creatorByHandle(cleanHandle(handle));
  return { title: creator ? `${creator.name} (@${creator.handle})` : "Storefront" };
}

const collections = ["All", "Trending", "The edit", "Favourites", "Wishlist"];

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const creator = creatorByHandle(cleanHandle(handle));
  if (!creator) notFound();

  const owned = productsForCreator(creator.handle);
  const products = owned.length >= 3 ? owned : [...owned, ...PRODUCTS].slice(0, 8);

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
                src={creatorPhoto(creator.handle)}
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
                    <a href="#" aria-label="Instagram" className="transition-colors hover:text-brand-pink">
                      <InstagramIcon size={18} />
                    </a>
                    <a href="#" aria-label="TikTok" className="transition-colors hover:text-brand-pink">
                      <TikTokIcon size={18} />
                    </a>
                    <a href="#" aria-label="YouTube" className="transition-colors hover:text-brand-pink">
                      <YouTubeIcon size={18} />
                    </a>
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
        <div className="flex flex-wrap gap-2.5">
          {collections.map((c, i) => (
            <Pill key={c} active={i === 0}>
              {c}
            </Pill>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={`${p.name}-${i}`} index={i % 4}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
