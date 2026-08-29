import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkBrandAccess } from "@/lib/auth/access";
import { brandInvoices, brandDashboard } from "@/lib/stats";
import { invoicesForBrand } from "@/lib/invoicing";
import { Badge } from "@/components/ui/primitives";
import { gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const statusTone: Record<string, "amber" | "cyan" | "green" | "neutral"> = {
  PENDING: "amber",
  APPROVED: "green",
  RETURNED: "neutral",
  CANCELLED: "neutral",
  REJECTED: "neutral",
};

const stageLabel: Record<string, string> = {
  PENDING: "In return window",
  VERIFIED: "Cleared",
  PAID_TO_PLUGGZ: "Settled",
  PAID_TO_CREATOR: "Settled",
};

export default async function BrandInvoicesPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const [rows, stats, invoices] = await Promise.all([
    brandInvoices(access.brandId),
    brandDashboard(access.brandId),
    invoicesForBrand(access.brandId),
  ]);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Every sale attributed to {access.brandName} through Pluggz, and where it
        sits. Commission becomes payable once a sale clears your{" "}
        {stats.brand?.returnWindowDays ?? 30}-day return window.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Confirmed sales" value={gbpFromPence(stats.salesValuePence)} sub={`${stats.salesCount} orders`} />
        <Summary label="Commission payable" value={gbpFromPence(stats.commissionPence)} sub="on confirmed sales" />
        <Summary
          label="Still in return window"
          value={gbpFromPence(stats.pendingValuePence)}
          sub={`${stats.pendingCount} orders · not yet charged`}
        />
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Your invoices
          </h2>
        </div>

        {invoices.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-text-muted">
            Nothing has been invoiced yet. An invoice is raised once sales have
            cleared your return window.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                <span className="font-mono text-sm text-text-strong">{inv.number}</span>
                <span className="text-sm text-text-muted">
                  {inv._count.sales} sale{inv._count.sales === 1 ? "" : "s"} to{" "}
                  {inv.periodEnd.toLocaleDateString("en-GB")}
                </span>
                <Badge tone={inv.status === "PAID" ? "green" : "amber"}>
                  {inv.status === "PAID"
                    ? "Paid " + (inv.paidAt ? inv.paidAt.toLocaleDateString("en-GB") : "")
                    : "Due " + inv.dueAt.toLocaleDateString("en-GB")}
                </Badge>
                <span className="ml-auto font-semibold text-text-strong">
                  {gbpFromPence(inv.amountPence)}
                </span>
                {inv.status !== "PAID" && inv.hostedInvoiceUrl && (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-pill bg-grad-brand px-4 py-1.5 text-sm font-medium text-white"
                  >
                    Pay this invoice
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Sales &amp; settlement
          </h2>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            No sales recorded yet. Clicks to your site are being tracked now, and
            sales appear here as they are reported and reconciled.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Creator</th>
                  <th className="px-6 py-3 font-medium">Sale</th>
                  <th className="px-6 py-3 font-medium">Commission</th>
                  <th className="px-6 py-3 font-medium">Clears</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-6 py-3.5 text-text-faint">
                      {r.orderRef ?? "Not given"}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {r.creatorProduct.product.name}
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {r.creatorProduct.profile.user.name}
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {gbpFromPence(r.valuePence)}
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {gbpFromPence(r.creatorAmountPence + r.pluggzAmountPence)}
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {r.verifiesAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={statusTone[r.status] ?? "neutral"}>
                        {r.status === "APPROVED"
                          ? (stageLabel[r.stage] ?? "Confirmed")
                          : r.status === "PENDING"
                            ? "In return window"
                            : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-text-faint">
        Questions about an invoice or a specific order? Contact the Pluggz team.
        Card and bank details are entered on Stripe&apos;s own pages, never here.
      </p>
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-text-strong">
        {value}
      </p>
      <p className="mt-1 text-xs text-text-faint">{sub}</p>
    </div>
  );
}
