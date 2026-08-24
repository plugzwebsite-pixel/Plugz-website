/**
 * The band a commission split has to sit in.
 *
 * One definition, imported by both the screen and the route that saves it.
 * They used to be written out separately in each, which meant the form could
 * happily accept a figure the server then refused, and nobody would know which
 * of the two was wrong.
 *
 * These are a guard, not the rate. The rate itself is set on the Rates and
 * terms screen, per creator or per brand as well as globally. The floors exist
 * so nobody can save a split that pays out more than the brand is charged, or
 * one so low it is not worth a creator's time.
 *
 * Lowered from 8 and 3 to 5 and 2 on 23 August 2026 at Lisa's request, with the
 * total minimum brought down with them. Leaving the total at 11 would have kept
 * the two new floors unreachable, which is exactly the fault that prompted it:
 * a rate that could be raised and not lowered.
 */
export const CREATOR_FLOOR = 5;
export const PLUGGZ_FLOOR = 2;

/** The floors added together. Anything lower cannot be expressed at all. */
export const TOTAL_MIN = CREATOR_FLOOR + PLUGGZ_FLOOR;
export const TOTAL_MAX = 15;

/** The most either side may take, so a typed figure cannot run away. */
export const RATE_CEILING = 30;
