import "server-only";
import { db } from "@/lib/db";
import { stripe, stripeConfigured } from "@/lib/stripe";

/**
 * Pluggz's own earnings arriving in Pluggz's own bank.
 *
 * The money a brand pays lands in the Pluggz balance at Stripe as one amount.
 * The creators' share is transferred out of it, and what remains is what the
 * company has earned. Stripe then pays that on to the company bank account on
 * its own schedule, and that movement was the one piece of the chain happening
 * entirely outside this system. The platform could say what it had earned and
 * could not say whether it had been paid.
 *
 * Taken from Stripe rather than calculated, because only Stripe knows the
 * figure that actually arrives. Fees come off, refunds come back, and a payout
 * covers whatever the balance happened to be when it was made, not a neat set
 * of sales.
 */

type StripePayoutish = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  failure_message?: string | null;
  destination?: unknown;
};

/** Write one of Stripe's payouts down, or bring our copy up to date. */
export async function recordPlatformPayout(payout: StripePayoutish, bankLast4?: string | null) {
  const data = {
    amountPence: payout.amount,
    currency: (payout.currency ?? "gbp").toUpperCase(),
    status: payout.status,
    arrivalDate: new Date(payout.arrival_date * 1000),
    failureReason: payout.failure_message ?? null,
    ...(bankLast4 ? { bankLast4 } : {}),
  };

  await db.platformPayout.upsert({
    where: { stripePayoutId: payout.id },
    create: { stripePayoutId: payout.id, ...data },
    update: data,
  });
}

/**
 * Catch up on everything Stripe has paid out.
 *
 * Run on a schedule as well as on the webhook. A webhook can be missed, an
 * endpoint can be disabled, and a secret can be rotated at the wrong moment;
 * none of those should mean the company's own income is missing from its own
 * books. Reading the list again costs one call and settles the question.
 */
export async function syncPlatformPayouts(limit = 50): Promise<{ seen: number; recorded: number }> {
  const s = stripe();
  if (!s) return { seen: 0, recorded: 0 };

  const list = await s.payouts.list({ limit });
  let recorded = 0;

  for (const payout of list.data) {
    let last4: string | null = null;
    // The destination is an id unless it was expanded; a bank account object
    // carries the last four digits that appear on a statement.
    const destination = payout.destination as { last4?: string } | string | null | undefined;
    if (destination && typeof destination === "object" && destination.last4) {
      last4 = destination.last4;
    }
    await recordPlatformPayout(payout as unknown as StripePayoutish, last4);
    recorded += 1;
  }

  return { seen: list.data.length, recorded };
}

export type MoneyLedger = {
  configured: boolean;
  /** Commission brands have paid, from invoices actually settled. */
  inFromBrands: { pence: number; invoices: number };
  /** Still invoiced and unpaid. */
  awaitingFromBrands: { pence: number; invoices: number };
  /** Earned but not yet billed to anybody. */
  notYetInvoiced: { pence: number; sales: number };
  /** Sent on to creators. */
  outToCreators: { pence: number; payouts: number };
  /** Owed to creators and not yet sent. */
  owedToCreators: { pence: number; sales: number };
  /** Pluggz's own share of everything settled. */
  pluggzEarned: { pence: number; sales: number };
  /** What Stripe has actually paid into the company bank. */
  paidToPluggzBank: { pence: number; payouts: number };
  /** In transit to the company bank right now. */
  onItsWay: { pence: number; payouts: number };
  /** What is sitting in the Stripe balance, as Stripe reports it. */
  stripeBalance: { availablePence: number; pendingPence: number } | null;
};

/**
 * The whole of the money, in one place.
 *
 * Deliberately shows both halves of every pair: what has moved and what has
 * not. A screen that only showed totals received would look healthy while a
 * brand quietly stopped paying.
 */
export async function moneyLedger(): Promise<MoneyLedger> {
  const [
    paidInvoices, openInvoices, unbilled, payoutsSent, owed, earned, bankPaid, bankPending,
  ] = await Promise.all([
    db.brandInvoice.aggregate({
      where: { status: "PAID" },
      _sum: { amountPence: true }, _count: true,
    }),
    db.brandInvoice.aggregate({
      where: { status: { in: ["DRAFT", "SENT"] } },
      _sum: { amountPence: true }, _count: true,
    }),
    db.sale.aggregate({
      where: { status: "APPROVED", stage: "VERIFIED", brandInvoiceId: null },
      _sum: { pluggzAmountPence: true, creatorAmountPence: true }, _count: true,
    }),
    db.payout.aggregate({
      where: { status: "SENT" },
      _sum: { amountPence: true }, _count: true,
    }),
    db.sale.aggregate({
      where: { status: "APPROVED", stage: "PAID_TO_PLUGGZ", payoutId: null },
      _sum: { creatorAmountPence: true }, _count: true,
    }),
    db.sale.aggregate({
      where: { status: "APPROVED", stage: { in: ["PAID_TO_PLUGGZ", "PAID_TO_CREATOR"] } },
      _sum: { pluggzAmountPence: true }, _count: true,
    }),
    db.platformPayout.aggregate({
      where: { status: "paid" },
      _sum: { amountPence: true }, _count: true,
    }),
    db.platformPayout.aggregate({
      where: { status: { in: ["pending", "in_transit"] } },
      _sum: { amountPence: true }, _count: true,
    }),
  ]);

  let stripeBalance: MoneyLedger["stripeBalance"] = null;
  const s = stripe();
  if (s) {
    try {
      const balance = await s.balance.retrieve();
      const gbp = (rows: { amount: number; currency: string }[]) =>
        rows.filter((b) => b.currency === "gbp").reduce((t, b) => t + b.amount, 0);
      stripeBalance = {
        availablePence: gbp(balance.available),
        pendingPence: gbp(balance.pending),
      };
    } catch (err) {
      // A screen that cannot reach Stripe should still show the books it owns.
      console.error("[money] could not read the Stripe balance:", err);
    }
  }

  return {
    configured: stripeConfigured(),
    inFromBrands: { pence: paidInvoices._sum.amountPence ?? 0, invoices: paidInvoices._count },
    awaitingFromBrands: { pence: openInvoices._sum.amountPence ?? 0, invoices: openInvoices._count },
    notYetInvoiced: {
      // Under money in from brands, so the whole commission rather than our half.
      pence: Number(unbilled._sum.pluggzAmountPence ?? 0) + Number(unbilled._sum.creatorAmountPence ?? 0),
      sales: unbilled._count,
    },
    outToCreators: { pence: payoutsSent._sum.amountPence ?? 0, payouts: payoutsSent._count },
    owedToCreators: { pence: Number(owed._sum.creatorAmountPence ?? 0), sales: owed._count },
    pluggzEarned: { pence: Number(earned._sum.pluggzAmountPence ?? 0), sales: earned._count },
    paidToPluggzBank: { pence: bankPaid._sum.amountPence ?? 0, payouts: bankPaid._count },
    onItsWay: { pence: bankPending._sum.amountPence ?? 0, payouts: bankPending._count },
    stripeBalance,
  };
}
