import type { Metadata } from "next";
import { Eye, MousePointerClick, Percent, Wallet, TrendingUp, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { StatCard } from "@/components/dashboard/stat-card";
import { AreaChart } from "@/components/dashboard/area-chart";
import { Badge } from "@/components/ui/primitives";
import { gbp } from "@/lib/utils";
import { PRODUCTS } from "@/lib/demo-data";

const productImage = (name: string) =>
  PRODUCTS.find((p) => p.name === name)?.image ?? "/images/products/p0.jpg";

export const metadata: Metadata = { title: "Creator dashboard" };

const perf = [12, 18, 15, 22, 19, 28, 24, 31, 27, 35, 33, 42, 38, 47];

const pipeline = [
  { label: "Pending", sub: "awaiting return window", value: 186, tone: "amber" as const },
  { label: "Verified", sub: "cleared, in next run", value: 352, tone: "cyan" as const },
  { label: "Paid", sub: "paid to you", value: 953, tone: "green" as const },
];

const sales = [
  { product: "Linen-blend holiday co-ord", brand: "Verano", value: 68, date: "12/07/2026", status: "Verified" },
  { product: "Wide-leg denim", brand: "Shein", value: 29, date: "11/07/2026", status: "Pending" },
  { product: "Satin slip midi dress", brand: "Halcyon London", value: 52, date: "09/07/2026", status: "Paid" },
  { product: "Oversized tailored blazer", brand: "North Row", value: 95, date: "08/07/2026", status: "Verified" },
  { product: "Ribbed knit lounge set", brand: "Marlowe & Co", value: 44, date: "05/07/2026", status: "Paid" },
  { product: "Wide-leg denim", brand: "Shein", value: 29, date: "03/07/2026", status: "Paid" },
];

const statusTone: Record<string, "amber" | "cyan" | "green"> = {
  Pending: "amber",
  Verified: "cyan",
  Paid: "green",
};

export default async function CreatorDashboardPage() {
  const user = await getSession();
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Welcome back, <span className="font-semibold text-text-strong">{firstName}</span> —
        here&apos;s how your storefront is performing.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard value="84,200" label="Profile views" delta={12} sub="vs last week" icon={Eye} />
        <StatCard value="12,400" label="Link clicks" delta={8} sub="vs last week" icon={MousePointerClick} />
        <StatCard value="4.2%" label="Conversion rate" sub="clicks → sales" icon={Percent} />
        <StatCard value={gbp(18640)} label="Sales value" sub="this month" icon={TrendingUp} />
        <StatCard value={gbp(1491)} label="Your commission" sub="8% you · 5% Pluggz" icon={Wallet} />
        <div className="relative overflow-hidden rounded-md border border-border bg-surface p-5">
          <span className="absolute left-5 top-0 h-0.5 w-10 rounded-b bg-grad-brand" />
          <div className="flex items-center gap-2 text-text-muted">
            <Trophy size={17} className="text-accent-gold" />
            <span className="text-sm font-medium">Your ranking</span>
          </div>
          <p className="mt-3 font-display text-4xl font-semibold text-text-strong">#4</p>
          <p className="mt-1 text-xs text-text-faint">
            of 62 creators · <span className="text-accent-green">Top 10%</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Performance */}
        <div className="rounded-md border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Performance · last 30 days
            </h2>
            <Badge tone="green">
              <TrendingUp size={12} /> 34%
            </Badge>
          </div>
          <div className="mt-6">
            <AreaChart data={perf} />
          </div>
        </div>

        {/* Payout pipeline */}
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
                  <div className="flex items-center gap-2">
                    <Badge tone={p.tone}>{p.label}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-text-faint">{p.sub}</p>
                </div>
                <span className="font-display text-2xl font-semibold text-text-strong">
                  {gbp(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Recent sales
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Brand</th>
                <th className="px-6 py-3 font-medium">Value</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={productImage(s.product)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="font-medium text-text-strong">{s.product}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-text-muted">{s.brand}</td>
                  <td className="px-6 py-3.5 text-text">{gbp(s.value)}</td>
                  <td className="px-6 py-3.5 text-text-muted">{s.date}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
