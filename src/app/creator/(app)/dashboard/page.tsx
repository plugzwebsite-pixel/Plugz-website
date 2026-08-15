import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MousePointerClick,
  Percent,
  Wallet,
  TrendingUp,
  Trophy,
  Package,
} from "lucide-react";
import { checkCreatorAccess } from "@/lib/auth/access";
import { creatorDashboard, creatorRecentSales } from "@/lib/stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaChart } from "@/components/dashboard/area-chart";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { compact, gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Creator dashboard" };

const stageTone: Record<string, "amber" | "cyan" | "green" | "neutral"> = {
  PENDING: "amber",
  VERIFIED: "cyan",
  PAID_TO_PLUGGZ: "cyan",
  PAID_TO_CREATOR: "green",
};

const stageLabel: Record<string, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  PAID_TO_PLUGGZ: "Verified",
  PAID_TO_CREATOR: "Paid",
};

export default async function CreatorDashboardPage() {
  const access = await checkCreatorAccess();
  if (!access.ok) redirect(access.redirectTo);

  const [stats, sales] = await Promise.all([
    creatorDashboard(access.profileId),
    creatorRecentSales(access.profileId),
  ]);

  const firstName = access.user.name.split(" ")[0];

  const pipeline = [
    {
      label: "Pending",
      sub: "awaiting the brand's return window",
      pence: stats.pipeline.pendingPence,
      tone: "amber" as const,
    },
    {
      label: "Verified",
      sub: "cleared, in the next run",
      pence: stats.pipeline.verifiedPence,
      tone: "cyan" as const,
    },
    {
      label: "Paid",
      sub: "paid to you",
      pence: stats.pipeline.paidPence,
      tone: "green" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Welcome back,{" "}
        <span className="font-semibold text-text-strong">{firstName}</span>
        {". Here's how your storefront is performing."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          value={compact(stats.clicks)}
          label="Link clicks"
          sub="shoppers sent to brands"
          icon={MousePointerClick}
        />
        <StatCard
          value={String(stats.liveProducts)}
          label="Live products"
          sub="on your storefront"
          icon={Package}
        />
        <StatCard
          value={
            stats.conversionRate === null
              ? "Not yet"
              : `${stats.conversionRate.toFixed(1)}%`
          }
          label="Conversion rate"
          sub="clicks → sales"
          icon={Percent}
        />
        <StatCard
          value={gbpFromPence(stats.salesValuePence)}
          label="Sales value"
          sub={`${stats.salesCount} sale${stats.salesCount === 1 ? "" : "s"} tracked`}
          icon={TrendingUp}
        />
        <StatCard
          value={gbpFromPence(stats.commissionPence)}
          label="Your commission"
          sub="8% you · 5% Pluggz"
          icon={Wallet}
        />

        <div className="relative overflow-hidden rounded-md border border-border bg-surface p-5">
          <span className="absolute left-5 top-0 h-0.5 w-10 rounded-b bg-grad-brand" />
          <div className="flex items-center gap-2 text-text-muted">
            <Trophy size={17} className="text-accent-gold" />
            <span className="text-sm font-medium">Your ranking</span>
          </div>
          <p className="mt-3 font-display text-4xl font-semibold text-text-strong">
            {stats.rank ? `#${stats.rank}` : "Unranked"}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            {stats.rank
              ? `of ${stats.rankOf} creators · by clicks earned`
              : "ranks once you have clicks"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-md border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Clicks · last 14 days
            </h2>
            <Badge tone="neutral">
              {compact(stats.clickSeries.reduce((s, p) => s + p.count, 0))} total
            </Badge>
          </div>
          <div className="mt-6">
            <AreaChart data={stats.clickSeries.map((p) => p.count)} />
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Payout pipeline
          </h2>
          <div className="mt-5 space-y-3">
            {pipeline.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between rounded-sm border border-border bg-surface-2/50 p-4"
              >
                <div>
                  <Badge tone={p.tone}>{p.label}</Badge>
                  <p className="mt-1.5 text-xs text-text-faint">{p.sub}</p>
                </div>
                <span className="font-display text-2xl font-semibold text-text-strong">
                  {gbpFromPence(p.pence)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-faint">
            Payouts run on the 1st and 15th of each month via Wise.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Recent sales
          </h2>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="mx-auto max-w-md text-sm text-text-muted">
              No sales tracked yet. Every click on your links is already being
              recorded. Sales appear here once brands report them back.
            </p>
            <Link href="/creator/storefront" className="mt-5 inline-block">
              <Button variant="secondary" size="sm">
                Add a product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Brand</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">You earn</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                          {s.creatorProduct.product.imageUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={s.creatorProduct.product.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </span>
                        <span className="font-medium text-text-strong">
                          {s.creatorProduct.product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {s.creatorProduct.product.brand.name}
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {gbpFromPence(s.valuePence)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {gbpFromPence(s.creatorAmountPence)}
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {s.soldAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={stageTone[s.stage] ?? "neutral"}>
                        {s.status === "RETURNED" ? "Returned" : stageLabel[s.stage]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
