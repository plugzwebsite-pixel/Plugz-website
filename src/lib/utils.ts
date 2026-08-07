import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic, de-duplicating conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as GBP currency. */
export function gbp(value: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
    ...opts,
  }).format(value);
}

/**
 * Money is stored in pence everywhere (see the Prisma schema) so that no
 * rounding ever happens in floating point. These convert at the display edge.
 */
export function gbpFromPence(pence: number, opts: Intl.NumberFormatOptions = {}) {
  return gbp(pence / 100, { maximumFractionDigits: 2, ...opts });
}

export function toPence(amount: number) {
  return Math.round(amount * 100);
}

/** Compact number formatting: 38200 -> "38.2k". */
export function compact(value: number) {
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Initials from a name: "Freya Sinclair" -> "FS". */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
