import type { Metadata } from "next";
import {
  ArrowDownLeft, ArrowUpRight, Landmark, Clock, Wallet, TriangleAlert,
} from "lucide-react";
import { db } from "@/lib/db";
import { moneyLedger } from "@/lib/platform-payouts";
import { Badge } from "@/components/ui/primitives";
import { gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Money" };
export const dynamic = "force-dynamic";

/**
 * Where all the money is.
 *
 * Three flows, each shown with both halves: what has moved and what has not.
 * A screen showing only totals received would look healthy while a brand had
 * quietly stopped paying, so every figure here has its unfinished counterpart
 * beside it.
 *
 * The last row is the one that did not exist before. Pluggz could always say
 * what it had earned; it could not say whether that money had actually reached
 * the company bank, because Stripe made that payment on its own and told
 * nobody. It is read back from Stripe now and recorded here.
 */
export default async function MoneyPage() {
  const [ledger, recent, failed] = await Promise.all([
    moneyLedger(),
    db.platformPayout.findMany({
      orderBy: { arrivalDate: "desc" },
      take: 12,
      select: {
        id: true, amountPence: true, status: true, arrivalDate: true,
        bankLast4: true, failureReason: true,
      },
    }),
    db.payout.count({ where: { status: "FAILED" } }),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <p className="max-w-2xl text-sm text-text-muted">
        A brand pays its commission into the Pluggz balance at Stripe. The
        creators&apos; share is sent on to them, and what is left is what Pluggz
        has earned, which Stripe pays into the company bank account. Every step
        below happens on its own; this is the record of it.
      </p>

      <Flow
        title="In, from the brands"
        icon={ArrowDownLeft}
        rows={[
          { label: "Paid", value: ledger.inFromBrands.pence, sub: `${ledger.inFromBrands.invoices} invoices settled`, tone: "green" },
          { label: "Invoiced, not yet paid", value: ledger.awaitingFromBrands.pence, sub: `${ledger.awaitingFromBrands.invoices} outstanding`, tone: "amber" },
          { label: "Earned, not yet invoiced", value: ledger.notYetInvoiced.pence, sub: `${ledger.notYetInvoiced.sales} sales cleared`, tone: "neutral" },
        ]}
      />

      <Flow
        title="Out, to the creators"
        icon={ArrowUpRight}
        rows={[
          { label: "Paid", value: ledger.outToCreators.pence, sub: `${ledger.outToCreators.payouts} payouts sent`, tone: "green" },
          { label: "Owed, due on the next run", value: ledger.owedToCreators.pence, sub: `${ledger.owedToCreators.sales} sales settled by their brand`, tone: "amber" },
        ]}
      />

      <Flow
        title="Pluggz's own share"
        icon={Landmark}
        rows={[
          { label: "Earned", value: ledger.pluggzEarned.pence, sub: `across ${ledger.pluggzEarned.sales} settled sales`, tone: "neutral" },
          { label: "Reached the company bank", value: ledger.paidToPluggzBank.pence, sub: `${ledger.paidToPluggzBank.payouts} payments from Stripe`, tone: "green" },
          { label: "On its way", value: ledger.onItsWay.pence, sub: `${ledger.onItsWay.payouts} in transit`, tone: "amber" },
        ]}
      />

      {ledger.stripeBalance && (
        <section className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-text-muted" />
            <h2 className="font-medium text-text-strong">Sitting at Stripe right now</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
            <Figure label="Available" value={ledger.stripeBalance.availablePence} />
            <Figure label="Clearing" value={ledger.stripeBalance.pendingPence} />
          </div>
          <p className="mt-3 text-xs text-text-faint">
            This is money in from brands that has not yet been sent on. It covers
            both the creators&apos; share and the company&apos;s, so it is not a
            profit figure.
          </p>
        </section>
      )}

      {failed > 0 && (
        <section className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert size={18} className="text-accent-amber" />
            <h2 className="font-medium text-text-strong">
              {failed} creator payout{failed === 1 ? "" : "s"} failed
            </h2>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            The next run will try again. The reason is recorded against each one
            on the payouts screen.
          </p>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">Recent payments into the company bank</h2>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 rounded-md border border-border bg-surface p-6 text-sm text-text-faint">
            Stripe has not paid anything into the company bank yet, or payouts
            are still on test keys.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
            {recent.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="font-medium text-text-strong">{gbpFromPence(p.amountPence)}</span>
                <Badge tone={p.status === "paid" ? "green" : p.status === "failed" ? "neutral" : "amber"}>
                  {p.status === "paid" ? "Arrived" : p.status === "in_transit" ? "On its way" : p.status}
                </Badge>
                <span className="text-sm text-text-muted">
                  {p.arrivalDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {p.bankLast4 ? ` into the account ending ${p.bankLast4}` : ""}
                </span>
                {p.failureReason && (
                  <span className="w-full text-sm text-text-muted">{p.failureReason}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Flow({
  title, icon: Icon, rows,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  rows: { label: string; value: number; sub: string; tone: "green" | "amber" | "neutral" }[];
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-text-muted" />
        <h2 className="font-medium text-text-strong">{title}</h2>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-border bg-surface p-5">
            <p className="text-sm text-text-muted">{r.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-text-strong">
              {gbpFromPence(r.value)}
            </p>
            <p className="mt-1 text-xs text-text-faint">{r.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-text-strong">
        {gbpFromPence(value)}
      </p>
    </div>
  );
}
