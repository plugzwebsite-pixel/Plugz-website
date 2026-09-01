import "server-only";
import { db } from "@/lib/db";
import { raiseInvoice } from "@/lib/invoicing";
import { stripeConfigured, ensureBrandCustomer, sendBrandInvoice } from "@/lib/stripe";

/**
 * Billing every brand that owes something, without anybody remembering to.
 *
 * The rule is deliberately one a person can hold in their head: a brand has at
 * most one invoice outstanding at a time, and a new one is raised as soon as
 * there is enough cleared commission to be worth billing. When the brand pays,
 * the next one can be raised. Nothing accumulates silently and nothing is
 * billed twice.
 *
 * A fixed monthly cycle was the obvious alternative and is worse here. Brands
 * are onboarded at different times and settle on different terms, so a single
 * billing date either bills some of them for four days of sales or makes the
 * others wait five weeks for money they have already earned.
 *
 * The minimum exists because a Stripe invoice for eighty pence costs more to
 * process than it collects, and because an invoice is a thing a person at the
 * brand has to read.
 *
 * Deciding who to bill and actually billing them are separate functions on
 * purpose. They were one, with a flag, and the flag only governed whether the
 * invoice was *sent*: asking what the run would do quietly raised every invoice
 * it was asked about. A preview that changes things is worse than no preview.
 */

const DEFAULT_MINIMUM_PENCE = 1000;

export type BillingCandidate = {
  brandId: string;
  brand: string;
  amountPence: number;
  contactEmail: string | null;
};

export type BillingSkip = { brand: string; reason: string };

export type BillingPreview = {
  live: boolean;
  considered: number;
  wouldRaise: BillingCandidate[];
  skipped: BillingSkip[];
};

export type BillingCycleResult = {
  live: boolean;
  considered: number;
  raised: { brand: string; number: string; amountPence: number; sales: number }[];
  sent: { brand: string; number: string }[];
  skipped: BillingSkip[];
  failed: { brand: string; reason: string }[];
};

/**
 * Who is due to be billed, and who is not and why. Reads only.
 */
export async function previewBillingCycle(minimumPence = DEFAULT_MINIMUM_PENCE): Promise<BillingPreview> {
  const preview: BillingPreview = {
    live: stripeConfigured(),
    considered: 0,
    wouldRaise: [],
    skipped: [],
  };

  // Every brand with cleared commission that has not been billed. Grouped in
  // the database rather than brand by brand, so this stays one query however
  // many brands there are.
  const unbilled = await db.sale.groupBy({
    by: ["creatorProductId"],
    where: { status: "APPROVED", stage: "VERIFIED", brandInvoiceId: null },
    _sum: { pluggzAmountPence: true, creatorAmountPence: true },
  });
  if (unbilled.length === 0) return preview;

  const listings = await db.creatorProduct.findMany({
    where: { id: { in: unbilled.map((u) => u.creatorProductId) } },
    select: { id: true, product: { select: { brandId: true } } },
  });
  const brandOfListing = new Map(listings.map((l) => [l.id, l.product.brandId]));

  const owed = new Map<string, number>();
  for (const row of unbilled) {
    const brandId = brandOfListing.get(row.creatorProductId);
    if (!brandId) continue;
    // The whole commission, which is what the brand is charged.
    const total = Number(row._sum.pluggzAmountPence ?? 0) + Number(row._sum.creatorAmountPence ?? 0);
    owed.set(brandId, (owed.get(brandId) ?? 0) + total);
  }
  preview.considered = owed.size;
  if (owed.size === 0) return preview;

  const brands = await db.brand.findMany({
    where: { id: { in: [...owed.keys()] } },
    select: { id: true, name: true, status: true, demo: true, contactEmail: true },
  });

  const openInvoices = await db.brandInvoice.groupBy({
    by: ["brandId"],
    where: { brandId: { in: [...owed.keys()] }, status: { in: ["DRAFT", "SENT"] } },
    _count: true,
  });
  const hasOpen = new Set(openInvoices.map((o) => o.brandId));

  for (const brand of brands) {
    const pence = owed.get(brand.id) ?? 0;

    // The demonstration shop's money is not real money.
    if (brand.demo) {
      preview.skipped.push({ brand: brand.name, reason: "the demonstration shop" });
      continue;
    }
    if (brand.status !== "ACTIVE") {
      preview.skipped.push({ brand: brand.name, reason: `the brand is ${brand.status.toLowerCase()}` });
      continue;
    }
    if (pence < minimumPence) {
      preview.skipped.push({
        brand: brand.name,
        reason: `only £${(pence / 100).toFixed(2)} owed, under the £${(minimumPence / 100).toFixed(2)} minimum`,
      });
      continue;
    }
    if (hasOpen.has(brand.id)) {
      preview.skipped.push({ brand: brand.name, reason: "an invoice is already awaiting payment" });
      continue;
    }

    preview.wouldRaise.push({
      brandId: brand.id,
      brand: brand.name,
      amountPence: pence,
      contactEmail: brand.contactEmail,
    });
  }

  return preview;
}

/**
 * Raise an invoice for everybody due, and hand each to Stripe to send.
 */
export async function runBillingCycle(input?: { minimumPence?: number }): Promise<BillingCycleResult> {
  const preview = await previewBillingCycle(input?.minimumPence ?? DEFAULT_MINIMUM_PENCE);

  const result: BillingCycleResult = {
    live: preview.live,
    considered: preview.considered,
    raised: [],
    sent: [],
    skipped: [...preview.skipped],
    failed: [],
  };

  for (const candidate of preview.wouldRaise) {
    const raised = await raiseInvoice(candidate.brandId);
    if (!raised.ok) {
      result.skipped.push({ brand: candidate.brand, reason: raised.reason });
      continue;
    }
    result.raised.push({
      brand: candidate.brand,
      number: raised.number,
      amountPence: raised.amountPence,
      sales: raised.count,
    });

    if (!stripeConfigured()) {
      result.skipped.push({ brand: candidate.brand, reason: "raised, but Stripe is not switched on to send it" });
      continue;
    }
    if (!candidate.contactEmail) {
      result.skipped.push({ brand: candidate.brand, reason: "raised, but the brand has no contact email to send it to" });
      continue;
    }

    try {
      const brand = await db.brand.findUnique({
        where: { id: candidate.brandId },
        select: { stripeCustomerId: true },
      });

      const customerId = await ensureBrandCustomer({
        existingId: brand?.stripeCustomerId ?? null,
        brandId: candidate.brandId,
        name: candidate.brand,
        email: candidate.contactEmail,
      });
      if (customerId !== brand?.stripeCustomerId) {
        await db.brand.update({ where: { id: candidate.brandId }, data: { stripeCustomerId: customerId } });
      }

      const invoice = await db.brandInvoice.findUnique({
        where: { id: raised.invoiceId },
        select: { dueAt: true },
      });
      const days = Math.max(
        1,
        Math.ceil(((invoice?.dueAt.getTime() ?? Date.now()) - Date.now()) / (24 * 60 * 60 * 1000))
      );

      const stripeInvoice = await sendBrandInvoice({
        customerId,
        amountPence: raised.amountPence,
        number: raised.number,
        brandName: candidate.brand,
        daysUntilDue: days,
        invoiceId: raised.invoiceId,
        lineDescription: "Pluggz commission on sales earned through creator storefronts",
      });

      await db.brandInvoice.update({
        where: { id: raised.invoiceId },
        data: {
          status: "SENT",
          issuedAt: new Date(),
          stripeInvoiceId: stripeInvoice.id,
          hostedInvoiceUrl: stripeInvoice.hostedInvoiceUrl,
          invoicePdfUrl: stripeInvoice.pdfUrl,
        },
      });
      result.sent.push({ brand: candidate.brand, number: raised.number });
    } catch (err) {
      // The invoice stands as raised. It can be sent from the admin screen, or
      // by the next run once whatever Stripe objected to is fixed. Rolling it
      // back would unbill sales that are correctly billed.
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[billing] could not send ${raised.number} to ${candidate.brand}:`, message);
      result.failed.push({ brand: candidate.brand, reason: message.slice(0, 160) });
    }
  }

  return result;
}
