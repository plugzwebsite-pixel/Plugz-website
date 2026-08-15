import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Queries behind the admin shopper directory.
 *
 * The page and the CSV export share every one of these on purpose. An export
 * that quietly disagrees with the list on screen is how a team ends up mailing
 * people who opted out, so there is one definition of "who matches" and both
 * callers use it.
 */

export const SHOPPER_FILTERS = ["all", "marketing", "verified"] as const;
export type ShopperFilter = (typeof SHOPPER_FILTERS)[number];

export function parseFilter(raw: string | undefined): ShopperFilter {
  return SHOPPER_FILTERS.includes(raw as ShopperFilter)
    ? (raw as ShopperFilter)
    : "all";
}

export const PER_PAGE = 50;

/**
 * Conditions are collected into an AND array rather than spread into one
 * object. Spreading means a second `OR` silently replaces the first, and the
 * condition that goes missing is never the one you notice.
 */
export function shopperWhere(
  query: string,
  filter: ShopperFilter
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (filter === "marketing") {
    and.push({ shopperProfile: { is: { marketingOptIn: true } } });
  }
  if (filter === "verified") {
    and.push({ emailVerified: { not: null } });
  }

  return { role: "SHOPPER", ...(and.length ? { AND: and } : {}) };
}

const shopperSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  createdAt: true,
  shopperProfile: {
    select: {
      city: true,
      interests: true,
      marketingOptIn: true,
      marketingOptInAt: true,
      marketingOptOutAt: true,
      signupSource: true,
    },
  },
} satisfies Prisma.UserSelect;

export type ShopperRow = Prisma.UserGetPayload<{ select: typeof shopperSelect }>;

export async function listShoppers({
  query,
  filter,
  page,
  take = PER_PAGE,
}: {
  query: string;
  filter: ShopperFilter;
  page: number;
  take?: number;
}): Promise<{ rows: ShopperRow[]; total: number }> {
  const where = shopperWhere(query, filter);

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: shopperSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    db.user.count({ where }),
  ]);

  return { rows, total };
}

/** Everything the header cards report. */
export async function shopperStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [total, marketing, verified, recent] = await Promise.all([
    db.user.count({ where: { role: "SHOPPER" } }),
    db.user.count({
      where: { role: "SHOPPER", shopperProfile: { is: { marketingOptIn: true } } },
    }),
    db.user.count({ where: { role: "SHOPPER", emailVerified: { not: null } } }),
    db.user.count({
      where: { role: "SHOPPER", createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return { total, marketing, verified, recent };
}

/** Serialise one CSV cell, quoting whatever would otherwise break the column. */
function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function shoppersToCsv(rows: ShopperRow[]): string {
  const header = [
    "Name",
    "Email",
    "City",
    "Interests",
    "Signed up",
    "Email confirmed",
    "Marketing consent",
    "Consent given",
    "Consent withdrawn",
    "Source",
  ];

  const day = (value: Date | null | undefined) =>
    value ? value.toISOString().slice(0, 10) : "";

  const body = rows.map((row) => {
    const p = row.shopperProfile;
    return [
      row.name,
      row.email,
      p?.city ?? "",
      (p?.interests ?? []).join("; "),
      day(row.createdAt),
      row.emailVerified ? "Yes" : "No",
      p?.marketingOptIn ? "Yes" : "No",
      // Only carries a date while the consent is actually in force. Leaving
      // the original date on a withdrawn opt-in reads as permission to send,
      // which is the one mistake this column exists to prevent.
      p?.marketingOptIn ? day(p.marketingOptInAt) : "",
      day(p?.marketingOptOutAt),
      p?.signupSource ?? "",
    ].map(cell);
  });

  // CRLF and a BOM so Excel opens it as UTF-8 rather than mangling accented
  // names into mojibake.
  return "﻿" + [header.map(cell), ...body].map((r) => r.join(",")).join("\r\n");
}
