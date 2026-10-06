import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/access";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pausing a brand, and deleting one.
 *
 * Pausing is the soft option: the storefront stops sending shoppers their way
 * and the postback starts refusing their sales, but everything stays on the
 * record. Deleting is final, so it is refused while any financial record
 * exists. A brand with sales, invoices, payouts or disputes keeps its history
 * even when it is gone from the catalogue, which is what the books require.
 */

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-brand-status"), 60, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const { id } = await params;
  const parsed = await parseBody(req, statusSchema);
  if (!parsed.success) return parsed.response;

  const brand = await db.brand.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!brand) return fail("That brand no longer exists.", 404);

  if (brand.status === "DRAFT") {
    return fail("Finish onboarding this brand before pausing or resuming it.", 422);
  }

  const updated = await db.brand.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return ok(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(req, "admin-brand-delete"), 20, 60_000);
  if (!limit.ok) return fail("Too many requests. Try again shortly.", 429);

  const admin = await requireAdmin();
  if (!admin.ok) return fail("Admins only.", 403);

  const { id } = await params;

  const brand = await db.brand.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!brand) return fail("That brand no longer exists.", 404);

  // Financial history survives the brand. Sales reach a brand through its
  // products' listings, so all four checks walk that path.
  const [sales, payouts, invoices, disputes] = await Promise.all([
    db.sale.count({
      where: { creatorProduct: { product: { brandId: id } } },
    }),
    db.payout.count({
      where: { sales: { some: { creatorProduct: { product: { brandId: id } } } } },
    }),
    db.brandInvoice.count({ where: { brandId: id } }),
    db.dispute.count({
      where: { sale: { creatorProduct: { product: { brandId: id } } } },
    }),
  ]);

  if (sales > 0 || payouts > 0 || invoices > 0 || disputes > 0) {
    return fail(
      "This brand has recorded sales and cannot be deleted. Pause it instead.",
      409
    );
  }

  // Deleting cascades to products, listings, brand contacts, invoices and
  // overrides, so there is nothing left pointing at a brand that is gone.
  await db.brand.delete({ where: { id } });

  return ok({ removed: true });
}
