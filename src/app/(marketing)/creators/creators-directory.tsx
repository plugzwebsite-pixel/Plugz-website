"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { CreatorCard } from "@/components/marketing/cards";
import { cn } from "@/lib/utils";
import type { CreatorCardData } from "@/lib/queries";

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-pink/60 bg-brand-pink/15 text-brand-pink"
          : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text-strong"
      )}
    >
      {label}
    </button>
  );
}

/**
 * Search and category filtering for the creators directory. The full list
 * arrives from the server component, so filtering is instant and costs no
 * extra requests.
 */
export function CreatorsDirectory({
  creators,
}: {
  creators: CreatorCardData[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = new Set(creators.map((c) => c.category));
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [creators]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return creators.filter((creator) => {
      if (activeCategory && creator.category !== activeCategory) return false;
      if (!q) return true;
      return (
        creator.name.toLowerCase().includes(q) ||
        creator.handle.toLowerCase().includes(q)
      );
    });
  }, [creators, query, activeCategory]);

  const hasActiveFilters = query.trim() !== "" || activeCategory !== null;

  function clearFilters() {
    setQuery("");
    setActiveCategory(null);
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <label htmlFor="creator-search" className="sr-only">
            Search creators
          </label>
          <input
            id="creator-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or handle"
            autoComplete="off"
            className="h-14 w-full rounded-pill border border-border bg-surface-2/80 pr-5 text-[0.95rem] text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
            style={{ paddingLeft: "3.25rem" }}
          />
        </div>
        <p className="text-sm text-text-muted" aria-live="polite">
          {filtered.length === 1 ? "1 creator" : `${filtered.length} creators`}
          {hasActiveFilters && ` of ${creators.length}`}
        </p>
      </div>

      {categories.length > 1 && (
        <div
          className="mt-5 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <FilterChip
            label="All"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map((category) => (
            <FilterChip
              key={category}
              label={category}
              active={activeCategory === category}
              onClick={() =>
                setActiveCategory(activeCategory === category ? null : category)
              }
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            <SearchX className="text-text-faint" size={28} />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
            No creators match your search
          </h2>
          <p className="mt-2 max-w-sm text-text-muted">
            Try a different name or handle, or clear the filters to see
            everyone.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-pill border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-strong transition-colors hover:border-brand-pink/50 hover:text-brand-pink"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((creator) => (
            <CreatorCard key={creator.handle} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
}
