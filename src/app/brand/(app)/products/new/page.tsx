import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { checkBrandAccess } from "@/lib/auth/access";
import { publicCategories } from "@/lib/categories";
import { BrandAddProductForm } from "@/components/brand/add-product-form";

export const metadata: Metadata = { title: "Add a product" };
export const dynamic = "force-dynamic";

export default async function BrandAddProductPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const categories = await publicCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/brand/products"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft size={14} />
        Your products
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-text-strong">
          Add a product
        </h1>
        <p className="mt-2 max-w-xl text-text-muted">
          Paste the address of the product on your own shop and we read the name,
          picture, description and price from it. The product joins the Pluggz
          catalogue for {access.brandName}, where creators can pick it up. Nothing
          appears publicly until one of them adds it to their storefront.
        </p>
      </div>

      <BrandAddProductForm categories={categories.map((c) => c.name)} />
    </div>
  );
}
