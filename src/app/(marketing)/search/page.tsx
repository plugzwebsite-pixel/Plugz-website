import type { Metadata } from "next";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { CreatorCard, ProductCard } from "@/components/marketing/cards";
import { SectionHeading } from "@/components/marketing/section";
import { searchCatalogue } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const { creators, products } = await searchCatalogue(query);
  const total = creators.length + products.length;

  return (
    <Container className="py-12">
      {/* Every other page names itself in a heading; this one had none at all,
          which leaves anyone using a screen reader with no idea where they
          have landed. Visually the search box already says it, so the heading
          is read rather than shown. */}
      <h1 className="sr-only">
        {query ? `Search results for ${q}` : "Search Pluggz"}
      </h1>

      <form action="/search" className="mx-auto max-w-2xl">
        <div className="relative">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search creators, products, brands…"
            className="h-14 w-full rounded-pill border border-border bg-surface-2/80 pr-5 text-[0.95rem] text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
            style={{ paddingLeft: "3.25rem" }}
          />
        </div>
      </form>

      {query && (
        <p className="mt-6 text-center text-sm text-text-muted">
          {total} result{total === 1 ? "" : "s"} for{" "}
          <span className="font-semibold text-text-strong">“{q}”</span>
        </p>
      )}

      {!query ? (
        <p className="mt-16 text-center text-text-faint">
          Start typing to search across creators and products.
        </p>
      ) : total === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <SearchX className="text-text-faint" size={28} />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
            No results for “{q}”
          </h2>
          <p className="mt-2 max-w-sm text-text-muted">
            Try a creator name, a brand, or a category like “beauty” or “travel”.
          </p>
        </div>
      ) : (
        <div className="mt-12 space-y-14">
          {creators.length > 0 && (
            <div>
              <SectionHeading title="Creators" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {creators.map((c) => (
                  <CreatorCard key={c.handle} creator={c} />
                ))}
              </div>
            </div>
          )}
          {products.length > 0 && (
            <div>
              <SectionHeading title="Products" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={`${p.creatorHandle}-${p.slug}`} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
