import { ok, fail } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { recordSale, resolveListing, SaleError } from "@/lib/sales";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Load a brand's sales report.
 *
 * This is how money actually reaches the commission engine today: a brand sends
 * a report, or a per-creator discount code is reconciled by hand. Both come in
 * as rows here.
 *
 * Runs as a dry run unless `commit` is set, because a mis-mapped report would
 * write commission against the wrong creators, and unpicking that by hand is
 * far worse than reading a preview first.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

type Row = Record<string, string>;

/**
 * Which character separates the columns.
 *
 * A comma, usually, but not always: Excel writes semicolons wherever the
 * system uses a comma for the decimal point, which is most of Europe, and a
 * brand sending a report from a German or French office sends semicolons
 * without knowing it. Read as commas, such a file parses as a single column,
 * every row is skipped for having no value in it, and the import looks broken
 * when it is only misread.
 *
 * Decided on the header line alone, and by simple majority, because the header
 * is the one row guaranteed to contain several columns.
 */
function detectDelimiter(src: string): string {
  const header = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const counts = [",", ";", "\t"].map((d) => ({ d, n: header.split(d).length - 1 }));
  const best = counts.sort((a, b) => b.n - a.n)[0];
  return best.n > 0 ? best.d : ",";
}

/** Split a CSV honouring quoted fields: order references contain commas. */
function parseCsv(src: string): { rows: Row[]; delimiter: string } {
  const delimiter = detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!header) return { rows: [], delimiter };
  const keys = header.map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  return {
    rows: body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()]))),
    delimiter,
  };
}

/**
 * "48.50", "£48.50" and "4850p" all mean the same thing to a brand.
 *
 * So does "48,50", and that one is why this takes the delimiter. A comma is a
 * thousands separator in a British report and a decimal point in a German one,
 * and the two readings of "48,50" are £48.50 and £4,850.00. Getting it wrong
 * does not fail: it records a hundred times the money and pays commission on
 * it. The file's own delimiter says which convention it was written in, since
 * a spreadsheet that separates columns with semicolons is one whose decimal
 * mark is a comma.
 */
function toPence(raw: string, delimiter = ","): number | null {
  let value = raw.replace(/[£$\s]/g, "");
  if (!value) return null;
  if (/^\d+p$/i.test(value)) return parseInt(value, 10);

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present, so whichever comes last is the decimal mark and the other
    // groups the thousands. "1.499,99" and "1,499.99" are the same amount.
    if (lastComma > lastDot) value = value.replace(/\./g, "").replace(",", ".");
    else value = value.replace(/,/g, "");
  } else if (lastComma !== -1) {
    // A comma alone. In a semicolon or tab separated file it is the decimal
    // mark. In a comma separated one it can only be grouping, because a decimal
    // comma would have split the column.
    if (delimiter !== ",") value = value.replace(",", ".");
    else value = value.replace(/,/g, "");
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  const limit = await rateLimit(clientKey(req, "sales-import"), 10, 60_000);
  if (!limit.ok) return fail("Too many imports. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Couldn't read that upload.", 400);
  }

  const file = form.get("file");
  const commit = form.get("commit") === "true";
  if (!(file instanceof File) || file.size === 0) {
    return fail("Choose a CSV file first.", 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return fail("That file is over 5MB. Split it and try again.", 400);
  }

  const { rows, delimiter } = parseCsv(await file.text());
  if (rows.length === 0) return fail("That file had no rows.", 400);
  if (rows.length > 2000) return fail("Import up to 2000 rows at a time.", 400);

  // Refuse a file whose value column was never found, rather than reporting a
  // hundred rows individually skipped for having no value in them.
  //
  // They mean quite different things. A handful of skipped rows is a report
  // with some gaps in it. Every row skipped is a report whose column is called
  // something we do not recognise, and the person uploading it needs to be told
  // that, not handed a list. Naming the headings we did read is what turns it
  // from "the import is broken" into a thing they can fix in Excel.
  const VALUE_COLUMNS = ["value", "amount", "total", "ordervalue"];
  const headings = Object.keys(rows[0] ?? {});
  if (!headings.some((h) => VALUE_COLUMNS.includes(h))) {
    return fail(
      `No order value column found. Rename one of your columns to "value", ` +
        `"amount", "total" or "order value". The columns we read were: ` +
        `${headings.filter(Boolean).join(", ") || "none"}.`,
      422
    );
  }

  const results: {
    line: number;
    order: string;
    value: string;
    outcome: string;
    creator?: string;
  }[] = [];
  let recorded = 0;

  for (const [i, row] of rows.entries()) {
    const line = i + 2; // header is line 1
    const order = row.orderref || row.order || row.orderid || row.reference || "";
    const pence = toPence(row.value || row.amount || row.total || row.ordervalue || "", delimiter);

    if (pence === null) {
      results.push({ line, order, value: "-", outcome: "Skipped, no usable order value" });
      continue;
    }

    const listingId = await resolveListing({
      clickRef: row.clickref || row.pz || row.pluggzref || null,
      discountCode: row.discountcode || row.code || row.coupon || null,
      handle: row.creator || row.handle || null,
      productSlug: row.product || row.productslug || row.slug || null,
    });

    if (!listingId) {
      results.push({
        line,
        order,
        value: `£${(pence / 100).toFixed(2)}`,
        outcome: "Skipped, couldn't match this to a creator's listing",
      });
      continue;
    }

    const soldRaw = row.date || row.soldat || row.orderdate || "";
    const soldAt = soldRaw && !Number.isNaN(Date.parse(soldRaw)) ? new Date(soldRaw) : undefined;

    if (!commit) {
      results.push({ line, order, value: `£${(pence / 100).toFixed(2)}`, outcome: "Will record" });
      recorded++;
      continue;
    }

    try {
      await recordSale({
        creatorProductId: listingId,
        valuePence: pence,
        orderRef: order || null,
        soldAt,
        clickRef: row.clickref || row.pz || null,
        source: "CSV",
      });
      results.push({ line, order, value: `£${(pence / 100).toFixed(2)}`, outcome: "Recorded" });
      recorded++;
    } catch (err) {
      results.push({
        line,
        order,
        value: `£${(pence / 100).toFixed(2)}`,
        outcome: err instanceof SaleError ? err.message : "Failed to record",
      });
    }
  }

  return ok({
    dryRun: !commit,
    total: rows.length,
    recorded,
    skipped: rows.length - recorded,
    results: results.slice(0, 200),
  });
}
