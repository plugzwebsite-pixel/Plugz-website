import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Deliberately does not read the session.
 *
 * Reading cookies here would opt every page underneath into per-request
 * rendering (the homepage, every storefront, every product page), so nothing
 * could be cached and each visitor would cost a full server render plus
 * database queries. The header resolves who's signed in on the client instead,
 * which keeps the whole shopper-facing site cacheable.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
