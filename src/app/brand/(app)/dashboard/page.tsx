import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MousePointerClick,
  TrendingUp,
  Percent,
  Wallet,
  Package,
  Clock,
} from "lucide-react";
import { checkBrandAccess } from "@/lib/auth/access";
import { brandDashboard, brandTopCreators } from "@/lib/stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaChart } from "@/components/dashboard/area-chart";
import { Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { compact, gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Performance" };

export default async function BrandDashboardPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const [stats, creators] = await Promise.all([
    brandDashboard(access.brandId),
    brandTopCreators(access.brandId),
  ]);

  const windowClicks = stats.series.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-text-muted">
          How {access.brandName} is performing on Pluggz. Every figure is counted
          from real shopper activity. Clicks are recorded the moment someone
          follows a creator&apos;s link to your site.
        </p>
        {stats.brand && (
          <div className="shrink-0 rounded-md border border-border bg-surface px-4 py-2.5 text-sm">
            <span className="text-text-muted">Your rate</span>{" "}
            <span className="font-semibold text-text-strong">
              {Number(stats.brand.commissionRate)}%
            </span>
            <span className="text-text-faint"> · {stats.brand.returnWindowDays}-day returns</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          value={compact(stats.clicks)}
          label="Shoppers sent to you"
          sub="tracked click-throughs"
          icon={MousePointerClick}
        />
        <StatCard
          value={String(stats.liveProducts)}
          label="Products live"
          sub="on creator storefronts"
          icon={Package}
        />
        <StatCard
          value={
            stats.conversionRate === null
              ? "Not yet"
              : `${stats.conversionRate.toFixed(1)}%`
          }
          label="Conversion rate"
          sub="clicks → confirmed sales"
          icon={Percent}
        />
        <StatCard
          value={gbpFromPence(stats.salesValuePence)}
          label="Sales through Pluggz"
          sub={`${stats.salesCount} confirmed`}
          icon={TrendingUp}
        />
        <StatCard
          value={gbpFromPence(stats.commissionPence)}
          label="Commission"
          sub="on confirmed sales only"
          icon={Wallet}
        />
        <StatCard
          value={gbpFromPence(stats.pendingValuePence)}
          label="In return window"
          sub={`${stats.pendingCount} awaiting confirmation`}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-md border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Shoppers sent to you · last 14 days
            </h2>
            <Badge tone="neutral">{compact(windowClicks)} in window</Badge>
          </div>
          <div className="mt-6">
            <AreaChart data={stats.series.map((p) => p.count)} />
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            What you keep
          </h2>
          <div className="mt-5 space-y-3">
            <Row label="Sales through Pluggz" value={gbpFromPence(stats.salesValuePence)} />
            <Row
              label="Less commission"
              value={`− ${gbpFromPence(stats.commissionPence)}`}
              muted
            />
            <div className="border-t border-border pt-3">
              <Row
                label="Net revenue"
                value={gbpFromPence(stats.netRevenuePence)}
                strong
              />
            </div>
            {stats.roi !== null && (
              <p className="pt-2 text-xs text-text-faint">
                £{stats.roi.toFixed(2)} of sales for every £1 of commission.
              </p>
            )}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-xs text-text-faint">
            Commission is charged on confirmed sales only, never on clicks or
            impressions. Returns inside your {stats.brand?.returnWindowDays ?? 30}-day
            window are removed automatically.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-text-strong">
          Creators driving your sales
        </h2>
        {creators.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">
            No creators have plugged your products yet.
          </p>
        ) : (
          <div className="mt-5 space-y-1">
            {creators.map((c, i) => (
              <Link
                key={c.handle}
                href={`/@${c.handle}`}
                target="_blank"
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
                    @{c.handle} · {compact(c.clicks)} clicks sent
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

      <p className="text-xs text-text-faint">
        Commission rates, campaigns and creator relationships are managed by the
        Pluggz team. Get in touch and we&apos;ll sort it.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={muted ? "text-sm text-text-faint" : "text-sm text-text-muted"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "font-display text-2xl font-semibold text-text-strong"
            : "text-sm font-medium text-text"
        }
      >
        {value}
      </span>
    </div>
  );
}
