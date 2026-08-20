import "server-only";
import type { SaleSource } from "@prisma/client";
import { db } from "@/lib/db";
import {
  resolveRates,
  splitCommission,
  effectiveReturnWindowDays,
  addDays,
} from "@/lib/commission";

/**
 * Recording a sale: the only way anything ever enters the commission engine.
 *
 * Everything downstream of this was built and had no input: the pipeline, the
 * payout runs, the brand invoices and every earnings figure on a creator's
 * dashboard all read from Sale rows, and nothing could create one. Until a
 * brand can call a postback or a store integration exists, sales arrive the way
 * the client said they would: a report from the brand, or a discount code
 * reconciled by hand. Both land here.
 *
 * Rates and the return window are resolved and snapshotted at the moment of
 * sale. Changing the global rate later must never rewrite what a creator has
 * already earned.
 */

export type SaleInput = {
  /** Which creator's listing earned it. */
  creatorProductId: string;
  valuePence: number;
  orderRef?: string | null;
  soldAt?: Date;
  /** The `pz` value from the click-out, when the brand passes it back. */
  clickRef?: string | null;
  /**
   * How it reached us. Worth recording because it decides how much the figure
   * can be trusted: a signed postback cannot be tampered with, a browser pixel
   * can. Callers that leave it unset are the admin ones, where a person has
   * already looked at the row.
   */
  source?: SaleSource;
};

export type RecordedSale = {
  id: string;
  valuePence: number;
  creatorAmountPence: number;
  pluggzAmountPence: number;
  verifiesAt: Date;
};

export async function recordSale(input: SaleInput): Promise<RecordedSale> {
  const listing = await db.creatorProduct.findUnique({
    where: { id: input.creatorProductId },
    select: {
      id: true,
      profileId: true,
      product: {
        select: {
          brandId: true,
          brand: {
            select: {
              returnWindowDays: true,
              returnWindowOverrides: {
                select: { days: true, startsAt: true, endsAt: true },
              },
            },
          },
        },
      },
    },
  });
  if (!listing) throw new SaleError("That listing doesn't exist.");
  if (input.valuePence <= 0) throw new SaleError("A sale needs a value above zero.");

  const brandId = listing.product.brandId;
  const soldAt = input.soldAt ?? new Date();

  const rates = await resolveRates(listing.profileId, brandId);
  const split = splitCommission(input.valuePence, rates);
  const windowDays = effectiveReturnWindowDays(
    listing.product.brand,
    listing.product.brand.returnWindowOverrides,
    soldAt
  );

  // Tie it to the click that earned it where the brand passed our reference
  // back. A sale without one still counts; it just can't be traced to a visit.
  let clickId: string | null = null;
  if (input.clickRef) {
    const click = await db.click.findUnique({
      where: { id: input.clickRef },
      select: { id: true },
    });
    clickId = click?.id ?? null;
  }

  const sale = await db.sale.create({
    data: {
      creatorProductId: listing.id,
      clickId,
      orderRef: input.orderRef?.trim() || null,
      valuePence: input.valuePence,
      source: input.source ?? "CSV",
      soldAt,
      verifiesAt: addDays(soldAt, windowDays),
      creatorRate: rates.creatorRate,
      pluggzRate: rates.pluggzRate,
      creatorAmountPence: split.creatorAmountPence,
      pluggzAmountPence: split.pluggzAmountPence,
    },
    select: {
      id: true,
      valuePence: true,
      creatorAmountPence: true,
      pluggzAmountPence: true,
      verifiesAt: true,
    },
  });

  return sale;
}

export class SaleError extends Error {}

/**
 * Find the listing a brand's report row refers to.
 *
 * A report gives whatever the brand happens to hold: our own click reference if
 * their system kept it, a creator's discount code, or just a handle and a
 * product. Each is tried in that order, most precise first.
 */
export async function resolveListing(row: {
  clickRef?: string | null;
  discountCode?: string | null;
  handle?: string | null;
  productSlug?: string | null;
}): Promise<string | null> {
  if (row.clickRef) {
    const click = await db.click.findUnique({
      where: { id: row.clickRef },
      select: { trackingLink: { select: { creatorProductId: true } } },
    });
    if (click) return click.trackingLink.creatorProductId;
  }

  if (row.discountCode) {
    const link = await db.trackingLink.findFirst({
      where: { discountCode: { equals: row.discountCode.trim(), mode: "insensitive" } },
      select: { creatorProductId: true },
    });
    if (link) return link.creatorProductId;
  }

  if (row.handle && row.productSlug) {
    const listing = await db.creatorProduct.findFirst({
      where: {
        slug: row.productSlug.trim(),
        profile: { handle: row.handle.trim().replace(/^@/, "") },
      },
      select: { id: true },
    });
    if (listing) return listing.id;
  }

  return null;
}
