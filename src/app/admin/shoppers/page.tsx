import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  MailCheck,
  BadgeCheck,
  UserPlus,
  Download,
  Search,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  listShoppers,
  parseFilter,
  shopperStats,
  PER_PAGE,
  type ShopperFilter,
} from "@/lib/shoppers";

export const metadata: Metadata = { title: "Shoppers" };

// Personal data read live, never prerendered, never cached.
export const dynamic = "force-dynamic";

const FILTER_LABELS: Record<ShopperFilter, string> = {
  all: "All shoppers",
  marketing: "Marketing consent only",
  verified: "Confirmed email only",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminShoppersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 80);
  const filter = parseFilter(params.filter);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [stats, { rows, total }] = await Promise.all([
    shopperStats(),
    listShoppers({ query, filter, page }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  const exportQuery = new URLSearchParams();
  if (query) exportQuery.set("q", query);
  if (filter !== "all") exportQuery.set("filter", filter);
  const exportHref = `/api/admin/shoppers/export${
    exportQuery.size ? `?${exportQuery}` : ""
  }`;

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (filter !== "all") sp.set("filter", filter);
    if (target > 1) sp.set("page", String(target));
    return `/admin/shoppers${sp.size ? `?${sp}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Everyone who has created a shopper account. Only the people who ticked
        the marketing box may be emailed a campaign. The consent column and
        the date it was given are recorded against each account so that can
        always be evidenced.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={String(stats.total)}
          label="Shopper accounts"
          sub="registered on Pluggz"
          icon={Users}
        />
        <StatCard
          value={String(stats.marketing)}
          label="Marketing consent"
          sub="may be sent campaigns"
          icon={MailCheck}
        />
        <StatCard
          value={String(stats.verified)}
          label="Confirmed emails"
          sub="address proven reachable"
          icon={BadgeCheck}
        />
        <StatCard
          value={String(stats.recent)}
          label="Joined in 30 days"
          sub="new sign-ups"
          icon={UserPlus}
        />
      </div>

      {/* A plain GET form: the filter lives in the URL, so a filtered view can
          be bookmarked, shared and handed straight to the export. */}
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
              placeholder="Search name or email"
              aria-label="Search shoppers"
              className="h-10 w-60 rounded-sm border border-border bg-surface-2 pl-10 pr-4 text-sm text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
            />
          </div>
          <select
            name="filter"
            defaultValue={filter}
            aria-label="Filter shoppers"
            className="h-10 rounded-sm border border-border bg-surface-2 px-3 text-sm text-text focus:border-brand-pink/60 focus:bg-surface"
          >
            {(Object.keys(FILTER_LABELS) as ShopperFilter[]).map((key) => (
              <option key={key} value={key}>
                {FILTER_LABELS[key]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
          {(query || filter !== "all") && (
            <Link
              href="/admin/shoppers"
              className="text-sm text-text-faint hover:text-text-strong"
            >
              Clear
            </Link>
          )}
        </form>

        <a href={exportHref} download>
          <Button size="sm">
            <Download size={15} /> Export CSV
          </Button>
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-20 text-center">
          <p className="text-sm text-text-muted">
            {query || filter !== "all"
              ? "No shoppers match that search."
              : "No shopper accounts yet. They arrive here from /signup/shopper."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3 font-semibold">Shopper</th>
                  <th className="px-5 py-3 font-semibold">City</th>
                  <th className="px-5 py-3 font-semibold">Shopping for</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const profile = row.shopperProfile;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 align-top"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-text-strong">{row.name}</p>
                        <a
                          href={`mailto:${row.email}`}
                          className="text-text-muted hover:text-brand-pink"
                        >
                          {row.email}
                        </a>
                        {profile?.signupSource && (
                          <p className="mt-0.5 text-xs text-text-faint">
                            via {profile.signupSource}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">
                        {profile?.city || "Not given"}
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">
                        {profile?.interests.length
                          ? profile.interests.join(", ")
                          : "Not given"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-text-muted">
                        {dateFormat.format(row.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.emailVerified ? (
                          <Badge tone="green">Confirmed</Badge>
                        ) : (
                          <Badge tone="neutral">Unconfirmed</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {profile?.marketingOptIn ? (
                          <>
                            <Badge tone="brand">Opted in</Badge>
                            {profile.marketingOptInAt && (
                              <p className="mt-1 whitespace-nowrap text-xs text-text-faint">
                                {dateFormat.format(profile.marketingOptInAt)}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge tone="neutral">No consent</Badge>
                            {profile?.marketingOptOutAt && (
                              <p className="mt-1 whitespace-nowrap text-xs text-text-faint">
                                withdrawn{" "}
                                {dateFormat.format(profile.marketingOptOutAt)}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-sm text-text-muted">
            <span>
              Showing {from} to {to} of {total}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)}>
                    <Button variant="secondary" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                <span className="px-1 text-text-faint">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link href={pageHref(page + 1)}>
                    <Button variant="secondary" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
