"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Send, Banknote, Ban, ExternalLink, ReceiptText, Landmark,
} from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { gbpFromPence } from "@/lib/utils";

/**
 * Billing the brands, and recording when they pay.
 *
 * The two halves of this screen are the work and the record. At the top, brands
 * with commission that has cleared its return window and has not been billed
 * yet. Below, every invoice raised, and what has happened to it.
 *
 * Settling an invoice is not a tidying action. It is the moment the platform
 * accepts that a brand's money has arrived, and it releases that invoice's
 * sales so the creators behind them can be paid. That is why the manual route
 * asks for a bank reference rather than just a confirmation: somebody should be
 * able to find the payment on a statement afterwards.
 */

type Awaiting = { id: string; name: string; pence: number; sales: number };

export type InvoiceRow = {
  id: string;
  number: string;
  amountPence: number;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  periodStart: string | Date;
  periodEnd: string | Date;
  dueAt: string | Date;
  issuedAt: string | Date | null;
  paidAt: string | Date | null;
  settledBy: "STRIPE" | "BANK_TRANSFER" | null;
  reference: string | null;
  hostedInvoiceUrl: string | null;
  stripeInvoiceId: string | null;
  brand: { id: string; name: string };
  _count: { sales: number };
};

const tone: Record<string, "amber" | "cyan" | "green" | "neutral"> = {
  DRAFT: "neutral",
  SENT: "amber",
  PAID: "green",
  VOID: "neutral",
};

const label: Record<string, string> = {
  DRAFT: "Not sent",
  SENT: "Awaiting payment",
  PAID: "Paid",
  VOID: "Cancelled",
};

function shortDate(d: string | Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function InvoicesManager({
  awaitingInvoice,
  invoices,
  stripeReady,
}: {
  awaitingInvoice: Awaiting[];
  invoices: InvoiceRow[];
  stripeReady: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function raise(brand: Awaiting) {
    if (
      !window.confirm(
        `Raise an invoice to ${brand.name} for ${gbpFromPence(brand.pence)}?\n\n` +
        `It covers ${brand.sales} sale${brand.sales === 1 ? "" : "s"}. The amount is fixed now, ` +
        `so a later change to their commission rate will not alter it.`
      )
    ) return;

    setBusy(brand.id);
    const res = await postJson<{ number: string; amountPence: number; count: number }>(
      "/api/admin/invoices", { action: "raise", brandId: brand.id }
    );
    setBusy(null);
    if (!res.ok) { toast.error("Couldn't raise that invoice", res.message); return; }
    toast.success(
      `Invoice ${res.data!.number} raised`,
      `${gbpFromPence(res.data!.amountPence)} across ${res.data!.count} sales. It has not been sent yet.`
    );
    router.refresh();
  }

  async function send(row: InvoiceRow) {
    if (
      !window.confirm(
        `Send invoice ${row.number} to ${row.brand.name} through Stripe?\n\n` +
        `Stripe emails them a page to pay on. When they pay, the sales behind this ` +
        `invoice are released so their creators can be paid.`
      )
    ) return;

    setBusy(row.id);
    const res = await postJson<{ hostedInvoiceUrl: string | null }>(
      "/api/admin/invoices", { action: "send", invoiceId: row.id }
    );
    setBusy(null);
    if (!res.ok) { toast.error("Stripe would not send it", res.message); return; }
    toast.success("Sent", `${row.brand.name} has been emailed invoice ${row.number}.`);
    router.refresh();
  }

  async function settle(row: InvoiceRow) {
    const reference = window.prompt(
      `Record that ${row.brand.name} paid ${row.number} (${gbpFromPence(row.amountPence)}).\n\n` +
      `Enter the bank reference so this can be matched to a statement later.`
    );
    if (reference === null) return;
    if (!reference.trim()) { toast.error("A reference is needed", "Enter the bank reference."); return; }

    setBusy(row.id);
    const res = await postJson<{ salesReleased: number }>(
      "/api/admin/invoices", { action: "settle", invoiceId: row.id, reference: reference.trim() }
    );
    setBusy(null);
    if (!res.ok) { toast.error("Couldn't record that", res.message); return; }
    toast.success(
      "Recorded as paid",
      `${res.data!.salesReleased} sale${res.data!.salesReleased === 1 ? "" : "s"} released for creator payout.`
    );
    router.refresh();
  }

  async function cancel(row: InvoiceRow) {
    if (
      !window.confirm(
        `Cancel invoice ${row.number}?\n\nIts ${row._count.sales} sales go back to being unbilled ` +
        `and can be invoiced again.`
      )
    ) return;
    setBusy(row.id);
    const res = await postJson("/api/admin/invoices", { action: "void", invoiceId: row.id });
    setBusy(null);
    if (!res.ok) { toast.error("Couldn't cancel it", res.message); return; }
    toast.success("Cancelled", `${row.number} has been cancelled.`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2">
          <ReceiptText size={18} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">Ready to invoice</h2>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          Commission that has cleared the brand&apos;s return window and has not
          been billed yet.
        </p>

        {awaitingInvoice.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-surface p-6 text-sm text-text-faint">
            Nothing is waiting to be invoiced.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Sales</th>
                  <th className="px-4 py-3 font-medium">Owed to Pluggz</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {awaitingInvoice.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-text-strong">{b.name}</td>
                    <td className="px-4 py-3 text-text-muted">{b.sales}</td>
                    <td className="px-4 py-3 text-text-strong">{gbpFromPence(b.pence)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" loading={busy === b.id} onClick={() => raise(b)}>
                        <FileText size={14} /> Raise invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2">
          <Landmark size={18} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">Invoices</h2>
        </div>
        {!stripeReady && (
          <p className="mt-2 rounded-sm border border-border bg-surface-2 p-3 text-sm text-text-muted">
            Stripe is not switched on, so invoices cannot be emailed from here.
            You can still raise them and record payments as they arrive.
          </p>
        )}

        {invoices.length === 0 ? (
          <p className="mt-4 rounded-md border border-border bg-surface p-6 text-sm text-text-faint">
            No invoices have been raised yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {invoices.map((row) => (
              <div key={row.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-sm text-text-strong">{row.number}</span>
                  <span className="font-medium text-text-strong">{row.brand.name}</span>
                  <Badge tone={tone[row.status]}>{label[row.status]}</Badge>
                  <span className="ml-auto text-base font-semibold text-text-strong">
                    {gbpFromPence(row.amountPence)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-text-muted">
                  {row._count.sales} sale{row._count.sales === 1 ? "" : "s"} from{" "}
                  {shortDate(row.periodStart)} to {shortDate(row.periodEnd)}.{" "}
                  {row.status === "PAID" ? (
                    <>
                      Paid {shortDate(row.paidAt)}
                      {row.settledBy === "BANK_TRANSFER"
                        ? " by bank transfer" + (row.reference ? ", reference " + row.reference : "")
                        : " through Stripe"}
                      .
                    </>
                  ) : row.status === "VOID" ? (
                    "Cancelled."
                  ) : (
                    <>Due {shortDate(row.dueAt)}.</>
                  )}
                </p>

                {row.status !== "PAID" && row.status !== "VOID" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!row.stripeInvoiceId && stripeReady && (
                      <Button size="sm" loading={busy === row.id} onClick={() => send(row)}>
                        <Send size={14} /> Send through Stripe
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === row.id}
                      onClick={() => settle(row)}
                    >
                      <Banknote size={14} /> Record a bank transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === row.id}
                      onClick={() => cancel(row)}
                    >
                      <Ban size={14} /> Cancel
                    </Button>
                  </div>
                )}

                {row.hostedInvoiceUrl && (
                  <a
                    href={row.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-text-muted underline underline-offset-4 hover:text-text-strong"
                  >
                    <ExternalLink size={14} /> The page the brand pays on
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
