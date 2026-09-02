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

/**
 * Words that cannot stand alone as somebody's name.
 *
 * Not an attempt at grammar. It is the short list of things that turn up as the
 * first word of a creator's handle-derived name and mean nothing on their own.
 */
const NOT_A_NAME = new Set([
  "the", "a", "an", "my", "mr", "mrs", "ms", "miss", "dr", "its", "im", "just",
]);

/**
 * The short name to put under a face or beside an avatar.
 *
 * A first name is the friendliest thing to show and the only thing that fits
 * under an eighty pixel portrait. Taking the first word blindly does not give
 * one: the creator called "The Mummy That Eats" appeared on the homepage as
 * "The", which reads as a page that has broken rather than as a person.
 *
 * So the first word is used only when it can stand on its own. Otherwise the
 * whole name is returned and left for the layout to truncate, which is untidy
 * in a way that is obviously deliberate rather than wrong.
 */
export function shortName(name: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  if (first.length >= 3 && !NOT_A_NAME.has(first.toLowerCase())) return first;
  return trimmed;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
