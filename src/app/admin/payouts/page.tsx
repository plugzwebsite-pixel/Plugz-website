import type { Metadata } from "next";
import { Clock, ShieldCheck, Building2, HandCoins, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { gbp } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };

const pipeline = [
  { label: "Pending", sub: "in return window", value: 4820, icon: Clock, tone: "amber" as const },
  { label: "Verified", sub: "window passed", value: 9310, icon: ShieldCheck, tone: "cyan" as const },
  { label: "Paid to Plugz", sub: "settled by brands", value: 7640, icon: Building2, tone: "brand" as const },
  { label: "Paid to creators", sub: "this month", value: 6120, icon: HandCoins, tone: "green" as const },
];

const rows = [
  { creator: "Freya Sinclair", brand: "Verano", value: 68, window: "30 days", status: "Verified" },
  { creator: "Aisha Bello", brand: "Aura Rituals", value: 42, window: "30 days", status: "Pending" },
  { creator: "Sophie Clarke", brand: "Nadine Merabi", value: 180, window: "14 days", status: "Paid" },
  { creator: "Freya Sinclair", brand: "North Row", value: 95, window: "30 days", status: "Verified" },
  { creator: "Jordan Reid", brand: "Aurate", value: 120, window: "45 days · seasonal", status: "Pending" },
  { creator: "Tommy Fields", brand: "Kova", value: 34, window: "30 days", status: "Paid" },
];

const statusTone: Record<string, "amber" | "cyan" | "green"> = {
  Pending: "amber",
  Verified: "cyan",
  Paid: "green",
};

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-text-muted">
          Every sale from Pending through to Paid. Runs go out twice a month.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5">
          <CalendarClock size={16} className="text-brand-pink" />
          <span className="text-sm text-text-muted">Next payout run</span>
          <span className="text-sm font-semibold text-text-strong">15 Aug 2026</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipeline.map((p) => (
          <div key={p.label} className="rounded-md border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-muted">
                <p.icon size={17} />
              </span>
              <Badge tone={p.tone}>{p.label}</Badge>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text-strong">
              {gbp(p.value)}
            </p>
            <p className="mt-1 text-xs text-text-faint">{p.sub}</p>
          </div>
        ))}
      </div>

      {/* Flow strip */}
      <div className="hidden items-center justify-between rounded-md border border-border bg-bg-elev px-8 py-5 text-sm text-text-muted sm:flex">
        {["Pending", "Verified", "Paid to Plugz", "Paid to Creator"].map((s, i, arr) => (
          <div key={s} className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-grad-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              {s}
            </span>
            {i < arr.length - 1 && <span className="text-text-faint">→</span>}
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Sales &amp; settlement
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">Creator</th>
                <th className="px-6 py-3 font-medium">Brand</th>
                <th className="px-6 py-3 font-medium">Value</th>
                <th className="px-6 py-3 font-medium">Return window</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-6 py-3.5 font-medium text-text-strong">{r.creator}</td>
                  <td className="px-6 py-3.5 text-text-muted">{r.brand}</td>
                  <td className="px-6 py-3.5 text-text">{gbp(r.value)}</td>
                  <td className="px-6 py-3.5 text-text-muted">{r.window}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
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
