import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  DisputesBoard,
  type DisputeRow,
  type SaleOption,
} from "@/components/admin/disputes-board";

export const metadata: Metadata = { title: "Disputes" };
export const dynamic = "force-dynamic";

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    pence / 100
  );

export default async function AdminDisputesPage() {
  const [rows, saleRows] = await Promise.all([
    db.dispute.findMany({
      // Open first, then most recently raised, so the queue reads as a queue.
      orderBy: [{ resolvedAt: "asc" }, { openedAt: "desc" }],
      select: {
        id: true,
        reason: true,
        status: true,
        detail: true,
        raisedBy: true,
        resolution: true,
        openedAt: true,
        resolvedAt: true,
        sale: {
          select: {
            id: true,
            orderRef: true,
            valuePence: true,
            creatorProduct: {
              select: {
                profile: { select: { handle: true } },
                product: {
                  select: { name: true, brand: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    db.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderRef: true,
        valuePence: true,
        soldAt: true,
        creatorProduct: {
          select: {
            profile: { select: { handle: true } },
            product: {
              select: { name: true, brand: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const disputes: DisputeRow[] = rows.map((d) => ({
    id: d.id,
    reason: d.reason,
    status: d.status,
    detail: d.detail,
    raisedBy: d.raisedBy,
    resolution: d.resolution,
    openedAt: d.openedAt.toISOString(),
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    sale: {
      id: d.sale.id,
      orderRef: d.sale.orderRef,
      valuePence: d.sale.valuePence,
      brand: d.sale.creatorProduct.product.brand.name,
      product: d.sale.creatorProduct.product.name,
      handle: d.sale.creatorProduct.profile.handle,
    },
  }));

  const sales: SaleOption[] = saleRows.map((s) => ({
    id: s.id,
    label: `${s.creatorProduct.product.brand.name} · ${gbp(s.valuePence)} · @${
      s.creatorProduct.profile.handle
    }${s.orderRef ? ` · ${s.orderRef}` : ""}`,
  }));

  return <DisputesBoard disputes={disputes} sales={sales} />;
}
