import type { Metadata } from "next";
import { Users, MousePointerClick, Repeat, Timer, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaChart } from "@/components/dashboard/area-chart";
import { Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { CREATORS, PRODUCTS } from "@/lib/demo-data";
import { compact, gbp } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const traffic = [320, 410, 380, 520, 610, 540, 700, 660, 820, 780, 910, 870, 1040, 1180];
const topCreators = CREATORS.filter((c) => c.trending).slice(0, 5);
const topProducts = PRODUCTS.slice(0, 5);

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Business health across the platform — traffic, engagement and what&apos;s
        driving sales.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value="18,240" label="Users this month" delta={14} sub="vs last" icon={Users} />
        <StatCard value="92,400" label="Click-throughs" delta={9} sub="vs last" icon={MousePointerClick} />
        <StatCard value="34%" label="Repeat users" delta={4} sub="genuine returns" icon={Repeat} />
        <StatCard value="3m 42s" label="Avg. time on site" delta={6} sub="vs last" icon={Timer} />
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Daily traffic · last 14 days
          </h2>
          <Badge tone="green">
            <TrendingUp size={12} /> 21%
          </Badge>
        </div>
        <div className="mt-6">
          <AreaChart data={traffic} height={220} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top creators */}
        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Top creators by sales
          </h2>
          <div className="mt-5 space-y-1">
            {topCreators.map((c, i) => (
              <div key={c.handle} className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface-2">
                <span className="w-5 text-center font-display text-lg font-semibold text-text-faint">
                  {i + 1}
                </span>
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">{c.name}</p>
                  <p className="text-xs text-text-faint">{compact(c.followers)} followers</p>
                </div>
                <span className="font-display text-sm font-semibold text-text">
                  {gbp(9000 - i * 1400)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Trending products
          </h2>
          <div className="mt-5 space-y-1">
            {topProducts.map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface-2">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                  <p className="text-xs text-text-faint">{p.brand}</p>
                </div>
                <Badge tone="amber">{p.heat} clicks</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
