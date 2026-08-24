"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { ProductCard } from "@/components/marketing/cards";
// A type only, so nothing from the server-only module reaches the browser.
import type { ProductCardData } from "@/lib/queries";

/**
 * The category grid, with its ordering done here rather than on the server.
 *
 * The ordering used to live in the address, which reads better and would be the
 * right answer on a bigger catalogue. It had one consequence that outweighed
 * that: reading a search parameter in the page opts the whole route out of
 * being prerendered, so every visit to every category rendered from scratch,
 * including the plain unsorted one that nobody had asked to sort. That undid
 * the caching work it shipped alongside.
 *
 * Doing it here keeps the page static for everyone. It costs nothing in
 * accuracy because a category page already loads its entire set: the largest
 * category on the site holds twenty two listings against a limit of forty
 * eight, so there is no second page for a sort to be wrong about.
 *
 * If a category ever outgrows that limit, this has to move back to the server
 * and the caching question has to be answered a different way, because sorting
 * one page of many in the browser silently sorts the wrong thing.
 */

export const CATEGORY_SORTS = {
  plugged: "Most plugged",
  new: "New in",
  under50: "Under £50",
  cheapest: "Price: low to high",
} as const;

export type CategorySort = keyof typeof CATEGORY_SORTS;

export function CategoryProducts({
  products,
  categoryName,
}: {
  products: ProductCardData[];
  categoryName: string;
}) {
  const [sort, setSort] = useState<CategorySort>("plugged");

  const shown = useMemo(() => {
    // A product with no price cannot honestly be called under fifty pounds, and
    // a good number have none, so they are left out of the price views rather
    // than shown as though they qualified.
    if (sort === "under50") {
      return products.filter((p) => p.pricePence !== null && p.pricePence <= 5000);
    }
    if (sort === "cheapest") {
      return products
        .filter((p) => p.pricePence !== null)
        .sort((a, b) => (a.pricePence ?? 0) - (b.pricePence ?? 0));
    }
    if (sort === "new") {
      // The server hands them back most plugged first, so newest is the
      // opposite end of the same list rather than a field we have to carry.
      return [...products].reverse();
    }
    return products;
  }, [products, sort]);

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {(Object.keys(CATEGORY_SORTS) as CategorySort[]).map((key) => (
          <Pill
            key={key}
            as="button"
            type="button"
            active={sort === key}
            onClick={() => setSort(key)}
          >
            {CATEGORY_SORTS[key]}
          </Pill>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 rounded-md border border-dashed border-border py-20 text-center text-text-faint">
          {products.length === 0
            ? `Nothing plugged in ${categoryName.toLowerCase()} yet. Check back soon.`
            : `Nothing in ${categoryName.toLowerCase()} matches that yet.`}
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((p, i) => (
            <Reveal key={`${p.creatorHandle}-${p.slug}`} index={i % 4}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
