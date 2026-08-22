import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { db } from "@/lib/db";
import {
  CredentialsManager,
  type CredentialBrand,
} from "@/components/admin/credentials-manager";

export const metadata: Metadata = { title: "Brand credentials" };
export const dynamic = "force-dynamic";

export default async function AdminCredentialsPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.redirectTo);

  const brands = await db.brand.findMany({
    where: { demo: false },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      platform: true,
      status: true,
      // Whether one exists, never the value. A stored secret is only ever read
      // to verify a signature, and nothing should be able to send it to a page.
      trackingKey: true,
      _count: { select: { products: true } },
    },
  });

  const rows: CredentialBrand[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    platform: b.platform,
    status: b.status,
    hasCredentials: b.trackingKey !== null,
    products: b._count.products,
  }));

  const issued = rows.filter((b) => b.hasCredentials).length;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="text-text-muted">
          What a brand needs to report its sales to us. A Shopify shop gets a
          snippet with its key already inside, which the shop owner pastes into
          their own admin. Any other shop gets a key and a signing secret for
          their developer.
        </p>
        <p className="mt-3 text-sm text-text-muted">
          Credentials are issued automatically when a brand is added, so most
          brands here will already have them. Use this screen for the ones added
          before that, and to replace a secret that has been lost or sent
          somewhere it should not have been.
        </p>
        <p className="mt-3 text-sm text-text-faint">
          {issued} of {rows.length} brands have credentials.
        </p>
      </div>

      <CredentialsManager brands={rows} />
    </div>
  );
}
