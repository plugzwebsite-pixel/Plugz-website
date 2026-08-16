import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { publicCategories } from "@/lib/categories";

/**
 * Deliberately does not read the session.
 *
 * Reading cookies here would opt every page underneath into per-request
 * rendering (the homepage, every storefront, every product page), so nothing
 * could be cached and each visitor would cost a full server render plus
 * database queries. The header resolves who's signed in on the client instead,
 * which keeps the whole shopper-facing site cacheable.
 *
 * The category list is read here, but it is cached under a tag rather than
 * queried per request, so it costs nothing per page and an admin edit still
 * shows up at once.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await publicCategories();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader categories={categories} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
