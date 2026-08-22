import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { checkBrandAccess } from "@/lib/auth/access";
import { brandCatalogue, brandProducts } from "@/lib/stats";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { compact, gbpFromPence } from "@/lib/utils";

export const metadata: Metadata = { title: "Your products" };

export default async function BrandProductsPage() {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  const [catalogue, products] = await Promise.all([
    brandCatalogue(access.brandId),
    brandProducts(access.brandId),
  ]);

  const waiting = catalogue.filter((p) => p.plugs === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-text-muted">
          Everything you have offered to Pluggz, and how far each item has got.
          A product is only visible to shoppers once a creator adds it to their
          own storefront.
        </p>
        <Link href="/brand/products/new" className="shrink-0">
          <Button size="sm">
            <Plus size={15} /> Add a product
          </Button>
        </Link>
      </div>

      {/* The catalogue first. Without it a brand adds a product and is shown a
          table that only lists creator storefronts, so the thing they just did
          appears to have failed. */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-medium text-text-strong">Your catalogue</h2>
          <span className="text-sm text-text-faint">
            {catalogue.length} product{catalogue.length === 1 ? "" : "s"}
            {waiting > 0 && `, ${waiting} not yet plugged`}
          </span>
        </div>

        {catalogue.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-text-muted">
              Nothing here yet. Add your first product and creators can start
              plugging it.
            </p>
            <Link href="/brand/products/new">
              <Button size="sm" className="mt-4">
                <Plus size={15} /> Add a product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Creators</th>
                  <th className="px-6 py-3 font-medium">Shoppers sent</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {catalogue.map((p) => (
                  <tr key={p.id} className="border-t border-border">
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
                        {!p.imageUrl && <Badge tone="amber">No photo</Badge>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">{p.category}</td>
                    <td className="px-6 py-3.5 text-text">
                      {p.pricePence === null ? (
                        <Badge tone="amber">Not set</Badge>
                      ) : (
                        gbpFromPence(p.pricePence)
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {p.plugs === 0 ? (
                        <span className="text-text-faint">Waiting</span>
                      ) : (
                        <span className="text-text">{p.plugs}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-text">{compact(p.clicks)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Your own product page"
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

      <h2 className="pt-2 font-medium text-text-strong">On creator storefronts</h2>
      <p className="-mt-4 max-w-2xl text-sm text-text-muted">
        Where your products have been plugged, and how each listing is
        performing. Click through to see the page a shopper actually lands on.
      </p>

      <div className="rounded-md border border-border bg-surface">
        {products.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            No creators have added your products yet. The Pluggz team is working
            through creator matching, and this fills up as they do.
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
                      {p.pricePence === null ? "Not listed" : gbpFromPence(p.pricePence)}
                    </td>
                    <td className="px-6 py-3.5 text-text">{compact(p.clicks)}</td>
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {p.salesPence > 0 ? gbpFromPence(p.salesPence) : "None yet"}
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
