import type { Metadata } from "next";
import { invoiceBoard } from "@/lib/invoicing";
import { stripeConfigured } from "@/lib/stripe";
import { InvoicesManager, type InvoiceRow } from "@/components/admin/invoices-manager";

export const metadata: Metadata = { title: "Brand invoices" };
export const dynamic = "force-dynamic";

/**
 * Billing the brands.
 *
 * This screen is the middle of the money pipeline. A sale clears its return
 * window on its own, and a creator is paid by the payout run on its own, but
 * between those two the brand has to actually pay us, and that is a real event
 * that somebody or something has to observe. Recording it here is what releases
 * the creators' share.
 */
export default async function AdminInvoicesPage() {
  const board = await invoiceBoard();

  return (
    <div className="max-w-4xl">
      <p className="mb-6 max-w-2xl text-sm text-text-muted">
        A sale is invoiced once its return window has passed. When the brand
        pays, that invoice&apos;s sales move to settled and their creators become
        payable on the next payout run. Paying through Stripe records itself;
        a bank transfer is recorded here.
      </p>

      <InvoicesManager
        awaitingInvoice={board.awaitingInvoice}
        invoices={board.invoices as unknown as InvoiceRow[]}
        stripeReady={stripeConfigured()}
      />
    </div>
  );
}
