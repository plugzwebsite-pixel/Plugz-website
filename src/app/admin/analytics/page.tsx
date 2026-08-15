import type { Metadata } from "next";
import Link from "next/link";
import { Users, MousePointerClick, Repeat, Store, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaChart } from "@/components/dashboard/area-chart";
import { Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { adminAnalytics, topCreators, topProducts } from "@/lib/stats";
import { compact, gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [stats, creators, products] = await Promise.all([
    adminAnalytics(),
    topCreators(5),
    topProducts(5),
  ]);

  const windowClicks = stats.series.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Business health across the platform: traffic, engagement and what&apos;s
        driving sales. Every figure here is counted from the tracking engine.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={compact(stats.uniqueVisitors)}
          label="Unique shoppers"
          sub="distinct attribution sessions"
          icon={Users}
        />
        <StatCard
          value={compact(stats.clicks)}
          label="Click-throughs"
          sub="sent to brand sites"
          icon={MousePointerClick}
        />
        <StatCard
          value={stats.repeatRate === null ? "Not yet" : `${stats.repeatRate.toFixed(0)}%`}
          label="Repeat shoppers"
          sub="returned on another day"
          icon={Repeat}
        />
        <StatCard
          value={String(stats.creators)}
          label="Live creators"
          sub={`${stats.listings} products · ${stats.brands} brands`}
          icon={Store}
        />
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Daily click-throughs · last 14 days
          </h2>
          <Badge tone="neutral">{compact(windowClicks)} in window</Badge>
        </div>
        <div className="mt-6">
          <AreaChart data={stats.series.map((p) => p.count)} height={220} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          value={String(stats.salesCount)}
          label="Sales tracked"
          sub="approved by brands"
          icon={TrendingUp}
        />
        <StatCard
          value={gbpFromPence(stats.salesValuePence)}
          label="Sales value"
          sub="through Pluggz links"
          icon={TrendingUp}
        />
        <StatCard
          value={gbpFromPence(stats.pluggzRevenuePence)}
          label="Pluggz revenue"
          sub="commission earned"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Top creators
          </h2>
          {creators.length === 0 ? (
            <p className="mt-6 text-sm text-text-faint">No live creators yet.</p>
          ) : (
            <div className="mt-5 space-y-1">
              {creators.map((c, i) => (
                <Link
                  key={c.handle}
                  href={`/@${c.handle}`}
                  className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface-2"
                >
                  <span className="w-5 text-center font-display text-lg font-semibold text-text-faint">
                    {i + 1}
                  </span>
                  <Avatar name={c.name} src={c.avatarUrl ?? undefined} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {c.name}
                    </p>
                    <p className="text-xs text-text-faint">
                      {compact(c.followers)} followers · {compact(c.clicks)} clicks
                    </p>
                  </div>
                  <span className="font-display text-sm font-semibold text-text">
                    {c.salesPence > 0 ? gbpFromPence(c.salesPence) : "None yet"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Most clicked products
          </h2>
          {products.length === 0 ? (
            <p className="mt-6 text-sm text-text-faint">Nothing plugged yet.</p>
          ) : (
            <div className="mt-5 space-y-1">
              {products.map((p) => (
                <Link
                  key={`${p.handle}-${p.slug}`}
                  href={`/@${p.handle}/${p.slug}`}
                  className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface-2"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {p.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {p.name}
                    </p>
                    <p className="text-xs text-text-faint">
                      {p.brand} · @{p.handle}
                    </p>
                  </div>
                  <Badge tone="amber">{compact(p.clicks)} clicks</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-faint">
        Time-on-site and navigation paths aren&apos;t tracked yet. They need the
        analytics script (PostHog) wiring in, which is separate from the affiliate
        engine.
      </p>
    </div>
  );
}
