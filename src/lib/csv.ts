/**
 * Minimal CSV parsing for the creator bulk import.
 *
 * Written by hand rather than pulled from a package because the input is a
 * spreadsheet export Rachel produces, and the failure mode that matters is a
 * quoted field containing a comma: a creator bio, or "Manchester, UK" in the
 * city column. Splitting on commas alone silently shifts every later column,
 * which would import the wrong data without erroring.
 */

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM. Excel writes one and it corrupts the first header.
  const text = input.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat \r\n as one break.
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

/**
 * Map rows onto their header names, tolerating the ways a person actually
 * types a header: different case, spaces, underscores, a trailing "count".
 */
export function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((row) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (row[i] ?? "").trim();
    });
    return rec;
  });
}

function normaliseHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/count$|url$|link$/, "");
}

/** Pick the first header variant that's actually present. */
export function field(rec: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const key = normaliseHeader(n);
    if (rec[key]) return rec[key];
  }
  return "";
}

/** "42.5k", "1,200", "1.2M" -> a number. Rachel's sheet will have all three. */
export function parseFollowers(raw: string): number {
  const value = raw.trim().toLowerCase().replace(/,/g, "");
  if (!value) return 0;
  const match = value.match(/^([\d.]+)\s*([km])?/);
  if (!match) return 0;
  const n = Number.parseFloat(match[1]);
  if (!Number.isFinite(n)) return 0;
  const scale = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.max(0, Math.round(n * scale));
}

/** Accepts a bare handle, an @handle, or a full profile URL. */
export function parseHandle(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const path = new URL(value).pathname.replace(/^\/+|\/+$/g, "");
      return path.split("/")[0].replace(/^@/, "");
    } catch {
      return "";
    }
  }
  return value.replace(/^@/, "");
}
