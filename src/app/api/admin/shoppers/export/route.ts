import { requireAdmin } from "@/lib/auth/access";
import {
  listShoppers,
  parseFilter,
  shoppersToCsv,
} from "@/lib/shoppers";

/**
 * Download the shopper list as CSV.
 *
 * Whatever is filtered on screen is what comes out of here. The export takes
 * the same query string and runs the same conditions, so "export" can never
 * mean "everyone" when the page was showing the opted-in subset.
 */
export const runtime = "nodejs";

// A hard ceiling rather than a stream. The whole list is held in memory to
// build the file, and an unbounded export is how a big table takes the server
// down; 20,000 rows is far beyond anything this platform has and still safe.
const MAX_ROWS = 20_000;

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return Response.json(
      { ok: false, message: "Admins only." },
      { status: 403 }
    );
  }

  const params = new URL(req.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 80);
  const filter = parseFilter(params.get("filter") ?? undefined);

  const { rows } = await listShoppers({ query, filter, page: 1, take: MAX_ROWS });
  const csv = shoppersToCsv(rows);

  const stamp = new Date().toISOString().slice(0, 10);
  const name = filter === "all" ? "shoppers" : `shoppers-${filter}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pluggz-${name}-${stamp}.csv"`,
      // Personal data, so never let a proxy or the browser keep a copy.
      "Cache-Control": "no-store",
    },
  });
}
