import { requireAdmin } from "@/lib/auth/access";
import { publicOrigin } from "@/lib/url";
import {
  listProductClicks,
  parseShow,
  parseSort,
  productClicksToCsv,
} from "@/lib/product-clicks";

/**
 * Download the click table as CSV.
 *
 * Whatever is filtered on screen is what comes out of here: the same query
 * string runs the same conditions, so "export" can never quietly mean
 * "everything" when the page was showing one brand.
 */
export const runtime = "nodejs";

// A ceiling rather than a stream. The rows are held in memory to build the
// file, and an unbounded export is how a large table takes a server down.
const MAX_ROWS = 20_000;

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return Response.json({ ok: false, message: "Admins only." }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 80);
  const brand = (params.get("brand") ?? "").trim();
  const show = parseShow(params.get("show") ?? undefined);
  const sort = parseSort(params.get("sort") ?? undefined);

  const { rows } = await listProductClicks({
    query,
    brand,
    show,
    sort,
    page: 1,
    take: MAX_ROWS,
  });

  const csv = productClicksToCsv(rows, publicOrigin(req));
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pluggz-product-clicks-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
