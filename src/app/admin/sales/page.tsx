import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { ImportSales } from "@/components/admin/import-sales";
import { recentSales } from "@/lib/stats";
import { gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Record sales" };
export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const recent = await recentSales(5);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Sales reach Pluggz as a report from the brand, or by reconciling a
        creator&apos;s discount code. Load either here and the commission engine
        does the rest — rates are taken as they stand today and fixed against
        each sale, so changing a rate later never rewrites what someone has
        already earned.
      </p>
      <ImportSales />

      {/* Whatever is loaded above lands in the ledger, which lives on another
          page. Without this, a successful import looks like nothing happened. */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Last recorded
          </h2>
          <Link
            href="/admin/payouts"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-strong"
          >
            All sales and settlement
            <ArrowRight size={14} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text-muted">
            Nothing recorded yet. Anything loaded above appears here straight
            away, and on the creator&apos;s own dashboard.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Creator</th>
                  <th className="px-6 py-3 font-medium">Brand</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">Creator earns</th>
                  <th className="px-6 py-3 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-6 py-3 font-mono text-xs text-text-muted">
                      {s.orderRef ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-text-strong">@{s.handle}</td>
                    <td className="px-6 py-3 text-text-muted">{s.brand}</td>
                    <td className="px-6 py-3 text-text-strong">
                      {gbpFromPence(s.valuePence)}
                    </td>
                    <td className="px-6 py-3 text-text-muted">
                      {gbpFromPence(s.creatorAmountPence)}
                    </td>
                    <td className="px-6 py-3 text-text-faint">
                      {s.soldAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
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
