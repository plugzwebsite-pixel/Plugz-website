import type { Metadata } from "next";
import Link from "next/link";
import { MousePointerClick, Package, PackageX, Store, Search, Download, ExternalLink } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { gbpFromPence } from "@/lib/utils";
import {
  brandsWithListings,
  listProductClicks,
  parseShow,
  parseSort,
  productClickStats,
  PER_PAGE,
  SHOW,
  SORTS,
  type Show,
  type Sort,
} from "@/lib/product-clicks";

export const metadata: Metadata = { title: "Product clicks" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; show?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 80);
  const brand = (params.brand ?? "").trim();
  const show = parseShow(params.show);
  const sort = parseSort(params.sort);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [stats, { rows, total }, brands] = await Promise.all([
    productClickStats(),
    listProductClicks({ query, brand, show, sort, page }),
    brandsWithListings(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);
  const shownClicks = rows.reduce((t, r) => t + r.clicks, 0);
  const filtered = Boolean(query || brand || show !== "all");

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: query, brand, show, sort, page: String(page), ...overrides };
    if (merged.q) sp.set("q", merged.q);
    if (merged.brand) sp.set("brand", merged.brand);
    if (merged.show && merged.show !== "all") sp.set("show", merged.show);
    if (merged.sort && merged.sort !== "clicks") sp.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    return `/admin/products${sp.size ? `?${sp}` : ""}`;
  }

  const exportSp = new URLSearchParams();
  if (query) exportSp.set("q", query);
  if (brand) exportSp.set("brand", brand);
  if (show !== "all") exportSp.set("show", show);
  if (sort !== "clicks") exportSp.set("sort", sort);

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-text-muted">
        Every product a shopper can click, and how many times they have. One row
        per creator per product, because the click is recorded against that
        creator&apos;s own link. The demonstration shop is excluded, so these are
        real shoppers going to real brands.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={String(stats.clicks)}
          label="Click-throughs"
          sub="sent to brand sites"
          icon={MousePointerClick}
        />
        <StatCard
          value={String(stats.clicked)}
          label="Products clicked"
          sub={`of ${stats.listings} live listings`}
          icon={Package}
        />
        <StatCard
          value={String(stats.unclicked)}
          label="No clicks yet"
          sub="listed but untouched"
          icon={PackageX}
        />
        <StatCard
          value={String(stats.brands)}
          label="Brands"
          sub="with a live listing"
          icon={Store}
        />
      </div>

      {/* Plain GET form: the filter lives in the URL, so a view can be
          bookmarked, sent to Lisa, and handed straight to the export. */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-border bg-surface p-4">
        <form method="get" className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Product, brand or creator"
              aria-label="Search products"
              className="h-10 w-64 rounded-sm border border-border bg-surface-2 pl-10 pr-4 text-sm text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
            />
          </div>

          <select
            name="brand"
            defaultValue={brand}
            aria-label="Filter by brand"
            className="h-10 max-w-52 rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus:border-brand-pink/60 focus:bg-surface"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            name="show"
            defaultValue={show}
            aria-label="Filter by click activity"
            className="h-10 rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus:border-brand-pink/60 focus:bg-surface"
          >
            {(Object.keys(SHOW) as Show[]).map((k) => (
              <option key={k} value={k}>
                {SHOW[k]}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={sort}
            aria-label="Sort products"
            className="h-10 rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus:border-brand-pink/60 focus:bg-surface"
          >
            {(Object.keys(SORTS) as Sort[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k]}
              </option>
            ))}
          </select>

          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {filtered && (
            <Link href="/admin/products" className="text-sm text-text-faint hover:text-text-strong">
              Clear
            </Link>
          )}
        </form>

        <a href={`/api/admin/products/export${exportSp.size ? `?${exportSp}` : ""}`} download>
          <Button size="sm">
            <Download size={15} /> Export CSV
          </Button>
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-20 text-center">
          <p className="text-sm text-text-muted">
            {filtered
              ? "Nothing matches that search."
              : "No live listings yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Brand</th>
                  <th className="px-5 py-3 font-semibold">Creator</th>
                  <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                  <th className="px-5 py-3 text-right font-semibold">Sales</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                          <ProductImage
                            src={r.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                            fallback={
                              <span className="grid h-full w-full place-items-center text-text-faint">
                                <Package size={14} />
                              </span>
                            }
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-strong">{r.product}</p>
                          <p className="truncate text-xs text-text-faint">{r.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{r.brand}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/@${r.handle}`}
                        className="text-text-muted transition-colors hover:text-text-strong"
                      >
                        @{r.handle}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-text-strong">
                      {r.clicks}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-text-muted">
                      {r.salesCount > 0 ? gbpFromPence(r.salesPence) : "None"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-text-faint">
                      {dateFormat.format(r.addedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={r.live ? "green" : "neutral"}>
                        {r.live ? "Live" : "Paused"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/@${r.handle}/${r.slug}`}
                        aria-label={`Open the Pluggz page for ${r.product}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-text-muted">
            <span>
              Showing {from} to {to} of {total}
              {filtered ? " matching" : ""} listing{total === 1 ? "" : "s"}
              {" · "}
              <span className="text-text-strong">{shownClicks}</span> click
              {shownClicks === 1 ? "" : "s"} on this page
              {!filtered && shownClicks !== stats.clicks && (
                <> of {stats.clicks} in total</>
              )}
            </span>
            {pages > 1 && (
              <span className="flex items-center gap-2">
                {page > 1 && (
                  <Link href={href({ page: String(page - 1) })}>
                    <Button variant="secondary" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                <span className="text-text-faint">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link href={href({ page: String(page + 1) })}>
                    <Button variant="secondary" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
