import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { checkBrandAccess } from "@/lib/auth/access";
import { brandProducts } from "@/lib/stats";
import { Badge } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { compact, gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Your products" };

export default async function BrandProductsPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const products = await brandProducts(access.brandId);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Every {access.brandName} product a creator has put on their storefront,
        and how each one is performing. Click through to see the page a shopper
        actually lands on.
      </p>

      <div className="rounded-md border border-border bg-surface">
        {products.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            No creators have added your products yet. The Pluggz team is working
            through creator matching — this fills up as they do.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Plugged by</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Shoppers sent</th>
                  <th className="px-6 py-3 font-medium">Sales</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={`${p.handle}-${p.slug}`} className="border-t border-border">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-2">
                          {p.imageUrl && (
                            <SmartImage
                              src={p.imageUrl}
                              alt=""
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </span>
                        <span className="font-medium text-text-strong">{p.name}</span>
                        {!p.live && <Badge tone="neutral">Paused</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {p.creator}
                      <span className="block text-xs text-text-faint">@{p.handle}</span>
                    </td>
                    <td className="px-6 py-3.5 text-text">
                      {p.pricePence === null ? "—" : gbpFromPence(p.pricePence)}
                    </td>
                    <td className="px-6 py-3.5 text-text">{compact(p.clicks)}</td>
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {p.salesPence > 0 ? gbpFromPence(p.salesPence) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/@${p.handle}/${p.slug}`}
                        target="_blank"
                        title="View the page shoppers see"
                        className="inline-grid h-8 w-8 place-items-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text-strong"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
