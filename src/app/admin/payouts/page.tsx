import type { Metadata } from "next";
import { Clock, ShieldCheck, Building2, HandCoins, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { payoutPipeline, settlementRows } from "@/lib/stats";
import { amountsOwedBoard, recentPayouts, PAYOUT_MINIMUM_PENCE } from "@/lib/payouts";
import { stripeConfigured } from "@/lib/stripe";
import { nextPayoutRun } from "@/lib/commission";
import { gbpFromPence } from "@/lib/utils";
import { PayoutsManager } from "@/components/admin/payouts-manager";

export const metadata: Metadata = { title: "Payouts" };

const statusTone: Record<string, "amber" | "cyan" | "green" | "neutral"> = {
  PENDING: "amber",
  VERIFIED: "cyan",
  PAID_TO_PLUGGZ: "cyan",
  PAID_TO_CREATOR: "green",
};

const stageLabel: Record<string, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  PAID_TO_PLUGGZ: "Paid to Pluggz",
  PAID_TO_CREATOR: "Paid to creator",
};

export default async function PayoutsPage() {
  const [pipeline, rows, owed, paid] = await Promise.all([
    payoutPipeline(),
    settlementRows(),
    amountsOwedBoard(),
    recentPayouts(),
  ]);
  const runDate = nextPayoutRun();

  const cards = [
    {
      label: "Pending",
      sub: "in the return window",
      value: pipeline.pending.valuePence,
      count: pipeline.pending.count,
      icon: Clock,
      tone: "amber" as const,
    },
    {
      label: "Verified",
      sub: "window passed",
      value: pipeline.verified.valuePence,
      count: pipeline.verified.count,
      icon: ShieldCheck,
      tone: "cyan" as const,
    },
    {
      label: "Paid to Pluggz",
      sub: "settled by brands",
      value: pipeline.paidToPluggz.valuePence,
      count: pipeline.paidToPluggz.count,
      icon: Building2,
      tone: "brand" as const,
    },
    {
      label: "Paid to creators",
      sub: "paid out",
      value: pipeline.paidToCreators.valuePence,
      count: pipeline.paidToCreators.count,
      icon: HandCoins,
      tone: "green" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-text-muted">
          Every sale from Pending through to Paid. Runs go out twice a month.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5">
          <CalendarClock size={16} className="text-brand-pink" />
          <span className="text-sm text-text-muted">Next payout run</span>
          <span className="text-sm font-semibold text-text-strong">
            {runDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-muted">
                <c.icon size={17} />
              </span>
              <Badge tone={c.tone}>{c.label}</Badge>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold text-text-strong">
              {gbpFromPence(c.value)}
            </p>
            <p className="mt-1 text-xs text-text-faint">
              {c.count} sale{c.count === 1 ? "" : "s"} · {c.sub}
            </p>
          </div>
        ))}
      </div>

      <PayoutsManager
        owed={owed}
        paid={paid.map((p) => ({
          ...p,
          sentAt: p.sentAt ? p.sentAt.toISOString() : null,
          runDate: p.runDate.toISOString(),
        }))}
        stripeReady={stripeConfigured()}
        minimumPence={PAYOUT_MINIMUM_PENCE}
      />

      <div className="hidden items-center justify-between rounded-md border border-border bg-bg-elev px-8 py-5 text-sm text-text-muted sm:flex">
        {["Pending", "Verified", "Paid to Pluggz", "Paid to Creator"].map((s, i, arr) => (
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

        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            No sales recorded yet. Clicks are being tracked now; sales appear here
            once brands report them or a discount code is reconciled.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Creator</th>
                  <th className="px-6 py-3 font-medium">Brand</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">Creator earns</th>
                  <th className="px-6 py-3 font-medium">Pluggz earns</th>
                  <th className="px-6 py-3 font-medium">Verifies</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {r.creatorProduct.profile.user.name}
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {r.creatorProduct.product.brand.name}
                      <span className="ml-1.5 text-xs text-text-faint">
                        {`(${r.creatorProduct.product.brand.returnWindowDays}d window)`}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {gbpFromPence(r.valuePence)}
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {gbpFromPence(r.creatorAmountPence)}
                    </td>
                    <td className="px-6 py-3 font-medium text-text-strong">
                      {gbpFromPence(r.pluggzAmountPence)}
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {r.verifiesAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={statusTone[r.stage] ?? "neutral"}>
                        {r.status === "RETURNED"
                          ? "Returned"
                          : stageLabel[r.stage]}
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
