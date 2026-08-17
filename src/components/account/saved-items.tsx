import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { SaveButton } from "@/components/marketing/save-button";
import { gbpFromPence } from "@/lib/utils";

export type SavedItem = {
  id: string;
  name: string;
  brand: string;
  pricePence: number | null;
  imageUrl: string | null;
  href: string;
  creatorHandle: string;
  savedAt: Date;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/**
 * The shopper's saved products.
 *
 * Each one keeps the creator who recommended it, because that is what the
 * shopper actually saved. Coming back to "the dress Katie plugged" is the
 * whole reason to have this list rather than a folder of links.
 */
export function SavedItems({ items }: { items: SavedItem[] }) {
  return (
    <section className="mt-6 rounded-md border border-border bg-surface p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Heart size={18} className="mt-0.5 shrink-0 text-brand-pink" />
          <div>
            <h2 className="font-display text-xl font-semibold text-text-strong">
              Saved items
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
              {items.length > 0
                ? "Everything you have saved, with the creator who plugged it."
                : "Nothing saved yet. Tap the heart on any product to keep it here."}
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 text-sm text-text-faint">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2.5 pl-[1.9rem]">
          <Link href="/">
            <Button size="sm">Browse creators</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-3.5">
              <Link
                href={item.href}
                className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2"
              >
                <ProductImage
                  src={item.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  seed={item.id}
                  label={item.brand}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={item.href} className="hover:text-brand-pink">
                  <p className="truncate font-medium text-text-strong">
                    {item.name}
                  </p>
                </Link>
                <p className="mt-0.5 truncate text-xs text-text-faint">
                  {item.brand}
                  {item.pricePence !== null && ` · ${gbpFromPence(item.pricePence)}`}
                  {` · plugged by @${item.creatorHandle}`}
                </p>
                <p className="mt-0.5 text-xs text-text-faint">
                  Saved {dateFormat.format(item.savedAt)}
                </p>
              </div>

              <SaveButton
                listingId={item.id}
                productName={item.name}
                compact
                className="shrink-0 bg-surface-2 text-text-muted hover:bg-surface-3"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
