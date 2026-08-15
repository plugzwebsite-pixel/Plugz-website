import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import { ProductImage } from "@/components/ui/product-image";
import { compact, gbpFromPence } from "@/lib/utils";
import type { CreatorCardData, ProductCardData } from "@/lib/queries";

export function CreatorCard({ creator }: { creator: CreatorCardData }) {
  return (
    <Link
      href={`/@${creator.handle}`}
      className="group relative flex flex-col rounded-md border border-border bg-surface p-5 transition-[transform,border-color,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_20px_44px_-26px_rgba(0,0,0,0.65)]"
    >
      <div className="flex items-start justify-between">
        <Avatar
          name={creator.name}
          src={creator.avatarUrl ?? undefined}
          size="lg"
          ring={creator.trending}
        />
        <ArrowUpRight
          size={18}
          className="text-text-faint transition-colors group-hover:text-brand-pink"
        />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-text-strong">
        {creator.name}
      </h3>
      <p className="mt-1 text-sm text-text-muted">{creator.tag}</p>
      <div className="mt-4 flex items-center justify-between">
        <Badge tone={creator.trending ? "brand" : "neutral"}>{creator.category}</Badge>
        <span className="text-xs text-text-faint">
          {creator.followers > 0 ? `${compact(creator.followers)} followers` : ""}
        </span>
      </div>
    </Link>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      // Straight to the Pluggz product page, never the brand. The shopper
      // reads the creator's review here first and only then clicks Buy Now.
      href={`/@${product.creatorHandle}/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-[transform,border-color,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_20px_44px_-26px_rgba(0,0,0,0.6)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {/* Contained, not cropped. A brand's own product shot is nearly always
            square or portrait, and filling a 4:3 card with it sliced the top
            and bottom off the product itself. */}
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          width={480}
          height={360}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          seed={`${product.brand}-${product.slug}`}
          label={product.brand}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        {product.clicks > 0 && (
          <Badge tone="amber" className="absolute left-3 top-3 backdrop-blur">
            <Flame size={11} /> {compact(product.clicks)}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between text-xs text-text-faint">
          <span className="truncate font-semibold uppercase tracking-wide">
            {product.brand}
          </span>
          <span className="shrink-0">@{product.creatorHandle}</span>
        </div>
        <h3 className="mt-1.5 flex-1 text-sm font-medium text-text-strong">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          {product.pricePence === null ? (
            // No price on the brand's page for this one. Say so, rather than
            // leaving a gap where a number should be.
            <span className="text-sm text-text-faint">Price at brand</span>
          ) : (
            <span className="font-display text-lg font-semibold text-text-strong">
              {gbpFromPence(product.pricePence)}
            </span>
          )}
          <span className="rounded-pill bg-grad-brand px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            See the review
          </span>
        </div>
      </div>
    </Link>
  );
}
