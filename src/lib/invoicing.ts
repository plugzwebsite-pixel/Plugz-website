import "server-only";
import { db } from "@/lib/db";
import type { SettlementMethod } from "@prisma/client";

/**
 * Billing a brand for the commission it owes, and recording when it pays.
 *
 * This is the middle of the money pipeline, and until now it was missing. A
 * sale went PENDING, cleared its return window and became VERIFIED, and there
 * it stopped: nothing in the codebase ever wrote PAID_TO_PLUGGZ, which is the
 * stage a payout run looks for. The last leg was built and the leg before it
 * was not, so in real operation no creator could ever have been paid.
 *
 * What closes the gap is an invoice that exists as a record rather than as a
 * sum. A brand receives it, pays it, and settling it moves its sales on. The
 * brand can pay it through Stripe, in which case Stripe tells us and nobody
 * touches anything, or by bank transfer, in which case somebody records that
 * they saw the money arrive. Both routes end in the same function, so the
 * pipeline cannot behave differently depending on how the money came in.
 */

/** A sale is billable once its return window has passed and the brand's settlement terms are up. */
export type Billable = {
  id: string;
  orderRef: string | null;
  soldAt: Date;
  verifiedAt: Date | null;
  valuePence: number;
  pluggzAmountPence: number;
  creatorAmountPence: number;
  productName: string;
  creatorHandle: string;
};

/**
 * What a brand could be invoiced for right now.
 *
 * Verified, so the refund risk has passed. Not already on an invoice, so the
 * same sale cannot be billed twice. Nothing here filters on the settlement
 * date: a brand on 30 day terms should still see the sale on an invoice as
 * soon as it clears, with the due date reflecting the terms. Billing late and
 * dating it correctly are different things, and conflating them was what made
 * this look complicated.
 */
export async function billableSales(brandId: string): Promise<Billable[]> {
  const rows = await db.sale.findMany({
    where: {
      status: "APPROVED",
      stage: "VERIFIED",
      brandInvoiceId: null,
      creatorProduct: { product: { brandId } },
    },
    orderBy: { soldAt: "asc" },
    select: {
      id: true,
      orderRef: true,
      soldAt: true,
      verifiedAt: true,
      valuePence: true,
      pluggzAmountPence: true,
      creatorAmountPence: true,
      creatorProduct: {
        select: {
          product: { select: { name: true } },
          profile: { select: { handle: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    orderRef: r.orderRef,
    soldAt: r.soldAt,
    verifiedAt: r.verifiedAt,
    valuePence: r.valuePence,
    pluggzAmountPence: r.pluggzAmountPence,
    creatorAmountPence: r.creatorAmountPence,
    productName: r.creatorProduct.product.name,
    creatorHandle: r.creatorProduct.profile.handle,
  }));
}

/**
 * Everything the admin billing screen shows.
 *
 * Two halves: what could be invoiced and has not been, and every invoice that
 * exists. The first half is the work; the second is the record.
 */
export async function invoiceBoard() {
  const [pending, invoices] = await Promise.all([
    db.sale.groupBy({
      by: ["creatorProductId"],
      where: { status: "APPROVED", stage: "VERIFIED", brandInvoiceId: null },
      _sum: { pluggzAmountPence: true },
      _count: true,
    }),
    db.brandInvoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, number: true, amountPence: true, status: true,
        periodStart: true, periodEnd: true, dueAt: true,
        issuedAt: true, paidAt: true, settledBy: true, reference: true,
        hostedInvoiceUrl: true, stripeInvoiceId: true,
        brand: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
    }),
  ]);

  // groupBy cannot reach through two relations to the brand, so the listings
  // are resolved separately and folded up here.
  const listingIds = pending.map((p) => p.creatorProductId);
  const listings = listingIds.length
    ? await db.creatorProduct.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, product: { select: { brand: { select: { id: true, name: true } } } } },
      })
    : [];
  const brandOf = new Map(listings.map((l) => [l.id, l.product.brand]));

  const owed = new Map<string, { id: string; name: string; pence: number; sales: number }>();
  for (const row of pending) {
    const brand = brandOf.get(row.creatorProductId);
    if (!brand) continue;
    const entry = owed.get(brand.id) ?? { id: brand.id, name: brand.name, pence: 0, sales: 0 };
    entry.pence += Number(row._sum.pluggzAmountPence ?? 0);
    entry.sales += row._count;
    owed.set(brand.id, entry);
  }

  return {
    awaitingInvoice: [...owed.values()].sort((a, b) => b.pence - a.pence),
    invoices,
  };
}

/** A brand's own invoices, for its dashboard. */
export async function invoicesForBrand(brandId: string) {
  return db.brandInvoice.findMany({
    where: { brandId, status: { not: "VOID" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, number: true, amountPence: true, status: true,
      periodStart: true, periodEnd: true, dueAt: true,
      issuedAt: true, paidAt: true, settledBy: true,
      hostedInvoiceUrl: true,
      _count: { select: { sales: true } },
    },
  });
}

/**
 * The next invoice number.
 *
 * Sequential and padded, because this is the reference a brand quotes on a
 * bank transfer. Derived from the highest number already issued rather than
 * from a count, so voiding an invoice cannot cause the next one to reuse a
 * number that has already been sent to somebody.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const last = await db.brandInvoice.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const n = last ? Number(last.number.replace(/\D/g, "")) : 0;
  return "PZ-" + String(n + 1).padStart(5, "0");
}

/**
 * Raise an invoice for everything a brand currently owes.
 *
 * The amount is fixed here, from the sales as they stand. An invoice is a
 * statement of what was owed on the day it was sent, so a later change to a
 * commission rate must not be able to reach back and alter it.
 */
export async function raiseInvoice(brandId: string): Promise<
  | { ok: true; invoiceId: string; number: string; amountPence: number; count: number }
  | { ok: false; reason: string }
> {
  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true, settlementDays: true },
  });
  if (!brand) return { ok: false, reason: "That brand doesn't exist." };

  const sales = await billableSales(brandId);
  if (sales.length === 0) {
    return { ok: false, reason: "There is nothing to invoice for this brand yet." };
  }

  const amountPence = sales.reduce((t, s) => t + s.pluggzAmountPence, 0);
  if (amountPence <= 0) {
    return { ok: false, reason: "Those sales add up to nothing owed." };
  }

  const dates = sales.map((s) => s.soldAt.getTime());
  const now = new Date();
  const number = await nextInvoiceNumber();

  // Written in one transaction with the sales attached. A half made invoice
  // that has claimed some sales but does not exist to be paid would strand
  // them: they would no longer be billable and would never be settled.
  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.brandInvoice.create({
      data: {
        brandId: brand.id,
        number,
        amountPence,
        status: "DRAFT",
        periodStart: new Date(Math.min(...dates)),
        periodEnd: new Date(Math.max(...dates)),
        dueAt: new Date(now.getTime() + brand.settlementDays * 24 * 60 * 60 * 1000),
      },
      select: { id: true, number: true, amountPence: true },
    });

    // Guarded on brandInvoiceId still being null, so two people pressing at
    // once cannot both claim the same sales.
    const claimed = await tx.sale.updateMany({
      where: { id: { in: sales.map((s) => s.id) }, brandInvoiceId: null },
      data: { brandInvoiceId: created.id },
    });
    if (claimed.count !== sales.length) {
      throw new Error("Those sales were being invoiced by somebody else. Try again.");
    }
    return created;
  });

  return {
    ok: true,
    invoiceId: invoice.id,
    number: invoice.number,
    amountPence: invoice.amountPence,
    count: sales.length,
  };
}

/**
 * Record that a brand has paid, and release the sales behind it.
 *
 * This is the single place a sale becomes PAID_TO_PLUGGZ, whether Stripe told
 * us or a person did. Everything is guarded on the invoice not already being
 * paid, so a webhook that arrives twice, or a webhook that arrives just after
 * somebody recorded the transfer by hand, settles it once and does nothing the
 * second time. Stripe retries webhooks, so this is a certainty rather than a
 * precaution.
 */
export async function settleInvoice(input: {
  invoiceId: string;
  method: SettlementMethod;
  reference?: string | null;
  settledById?: string | null;
  paidAt?: Date;
}): Promise<{ settled: boolean; salesMoved: number; alreadyPaid: boolean }> {
  const paidAt = input.paidAt ?? new Date();

  return db.$transaction(async (tx) => {
    const marked = await tx.brandInvoice.updateMany({
      where: { id: input.invoiceId, status: { in: ["DRAFT", "SENT"] } },
      data: {
        status: "PAID",
        paidAt,
        settledBy: input.method,
        reference: input.reference ?? null,
        settledById: input.settledById ?? null,
      },
    });

    if (marked.count === 0) {
      const existing = await tx.brandInvoice.findUnique({
        where: { id: input.invoiceId },
        select: { status: true },
      });
      return {
        settled: false,
        salesMoved: 0,
        alreadyPaid: existing?.status === "PAID",
      };
    }

    // Only sales still sitting at VERIFIED move. One already further along was
    // settled by an earlier run and must not be dragged backwards.
    const moved = await tx.sale.updateMany({
      where: { brandInvoiceId: input.invoiceId, stage: "VERIFIED" },
      data: { stage: "PAID_TO_PLUGGZ", paidToPluggzAt: paidAt },
    });

    return { settled: true, salesMoved: moved.count, alreadyPaid: false };
  });
}

/**
 * Cancel an invoice that should not have been raised.
 *
 * Its sales go back in the pool to be billed again. A paid invoice cannot be
 * voided, because the money has moved and the record of that is the point.
 */
export async function voidInvoice(invoiceId: string): Promise<{ ok: boolean; reason?: string }> {
  return db.$transaction(async (tx) => {
    const invoice = await tx.brandInvoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });
    if (!invoice) return { ok: false, reason: "That invoice doesn't exist." };
    if (invoice.status === "PAID") {
      return { ok: false, reason: "That invoice has been paid. It cannot be cancelled." };
    }
    await tx.sale.updateMany({
      where: { brandInvoiceId: invoiceId },
      data: { brandInvoiceId: null },
    });
    await tx.brandInvoice.update({
      where: { id: invoiceId },
      data: { status: "VOID" },
    });
    return { ok: true };
  });
}
