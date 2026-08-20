import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { BrandList, type BrandRow } from "@/components/admin/brand-list";

export const metadata: Metadata = { title: "Brands" };

async function loadBrands(): Promise<BrandRow[]> {
  const brands = await db.brand.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      platform: true,
      commissionRate: true,
      returnWindowDays: true,
      users: { select: { name: true, email: true } },
      products: {
        select: {
          creatorProducts: {
            select: {
              trackingLink: { select: { clickCount: true } },
              sales: { where: { status: "APPROVED" }, select: { valuePence: true } },
            },
          },
        },
      },
    },
  });

  return brands.map((b) => {
    const listings = b.products.flatMap((p) => p.creatorProducts);
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      commissionRate: Number(b.commissionRate),
      returnWindowDays: b.returnWindowDays,
      productCount: listings.length,
      clicks: listings.reduce((s, l) => s + (l.trackingLink?.clickCount ?? 0), 0),
      salesPence: listings.reduce(
        (s, l) => s + l.sales.reduce((t, x) => t + x.valuePence, 0),
        0
      ),
      contacts: b.users,
      platform: b.platform,
    };
  });
}

export default async function AdminBrandsPage() {
  const brands = await loadBrands();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-text-muted">
          Every brand on Pluggz. Invite a contact to give them a read-only
          dashboard of their own performance, useful when pitching, and it saves
          answering &ldquo;how are we doing?&rdquo; by email.
        </p>
        <Link
          href="/admin/brands/new"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-pink hover:underline"
        >
          <Plus size={15} /> Add a brand
        </Link>
      </div>

      <BrandList initial={brands} />
    </div>
  );
}
