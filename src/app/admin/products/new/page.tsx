import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { publicCategories } from "@/lib/categories";
import { AddProductForm } from "@/components/admin/add-product-form";

export const metadata: Metadata = { title: "Add products" };
export const dynamic = "force-dynamic";

export default async function AddProductPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const [brands, categories] = await Promise.all([
    db.brand.findMany({
      // Every brand, including the ones still in draft: products are added
      // while a deal is being agreed, and a catalogue that could only be filled
      // after a brand went live would always be a step behind.
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { products: true } } },
    }),
    publicCategories(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft size={14} />
        Product clicks
      </Link>

      <p className="text-text-muted">
        Paste the address of a product page and the shop&apos;s own page supplies
        the name, the picture and the price. The product joins the catalogue for
        this brand and becomes available for creators to plug.
      </p>

      <AddProductForm
        brands={brands.map((b) => ({
          id: b.id,
          name: b.name,
          productCount: b._count.products,
        }))}
        categories={categories.map((c) => c.name)}
      />
    </div>
  );
}
