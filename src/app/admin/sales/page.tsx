import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { ImportSales } from "@/components/admin/import-sales";

export const metadata: Metadata = { title: "Record sales" };

export default async function AdminSalesPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Sales reach Pluggz as a report from the brand, or by reconciling a
        creator&apos;s discount code. Load either here and the commission engine
        does the rest — rates are taken as they stand today and fixed against
        each sale, so changing a rate later never rewrites what someone has
        already earned.
      </p>
      <ImportSales />
    </div>
  );
}
