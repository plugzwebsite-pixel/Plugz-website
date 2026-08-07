import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Commission resolution and the automatic split.
 *
 * Precedence, most specific first: a creator override beats a brand override,
 * which beats the platform default. Rates are percentages of sale value.
 */

export type Rates = { creatorRate: number; pluggzRate: number };

/** Falls back to the documented 8% / 5% target if the singleton is missing. */
const FALLBACK: Rates = { creatorRate: 8, pluggzRate: 5 };

function toNumber(d: Prisma.Decimal | number): number {
  return typeof d === "number" ? d : Number(d);
}

export async function platformDefaultRates(): Promise<Rates> {
  const setting = await db.platformSetting.findUnique({
    where: { id: "singleton" },
  });
  if (!setting) return FALLBACK;
  return {
    creatorRate: toNumber(setting.defaultCreatorRate),
    pluggzRate: toNumber(setting.defaultPluggzRate),
  };
}

export async function resolveRates(
  creatorProfileId: string,
  brandId: string
): Promise<Rates> {
  const [creatorOverride, brandOverride, defaults] = await Promise.all([
    db.commissionOverride.findUnique({ where: { creatorProfileId } }),
    db.commissionOverride.findUnique({ where: { brandId } }),
    platformDefaultRates(),
  ]);

  const chosen = creatorOverride ?? brandOverride;
  if (!chosen) return defaults;
  return {
    creatorRate: toNumber(chosen.creatorRate),
    pluggzRate: toNumber(chosen.pluggzRate),
  };
}

/**
 * Split a sale. Pence in, pence out — the creator's share is rounded down and
 * Pluggz absorbs the remainder, so the two parts can never sum to more than
 * the commission actually collected from the brand.
 */
export function splitCommission(valuePence: number, rates: Rates) {
  const creatorAmountPence = Math.floor((valuePence * rates.creatorRate) / 100);
  const pluggzAmountPence = Math.floor((valuePence * rates.pluggzRate) / 100);
  return { creatorAmountPence, pluggzAmountPence };
}

/**
 * The return window that actually applies to a sale made at `at`.
 *
 * Brands extend their window seasonally (Christmas, Black Friday), so a
 * date-bound override wins over the brand's standing figure. The longest
 * applicable override wins if several overlap.
 */
export function effectiveReturnWindowDays(
  brand: { returnWindowDays: number },
  overrides: { days: number; startsAt: Date; endsAt: Date }[],
  at: Date = new Date()
): number {
  const active = overrides.filter((o) => o.startsAt <= at && at <= o.endsAt);
  if (active.length === 0) return brand.returnWindowDays;
  return Math.max(brand.returnWindowDays, ...active.map((o) => o.days));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Next twice-monthly payout run on or after `from` — the 1st or the 15th.
 * Confirmed cadence, matching how Awin pays its own publishers.
 */
export function nextPayoutRun(from: Date = new Date()): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const d = from.getUTCDate();
  if (d < 15) return new Date(Date.UTC(y, m, 15));
  return new Date(Date.UTC(y, m + 1, 1));
}
