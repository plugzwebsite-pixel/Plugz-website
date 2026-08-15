import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * The shopper account sits on the public chrome rather than a dashboard shell.
 *
 * A shopper is here for a minute to change a preference and then goes back to
 * browsing, so the header and footer they were already using stay put. It has
 * its own layout instead of joining the (marketing) group because the pages
 * underneath read the session, and the marketing layout is deliberately kept
 * free of that so the whole shopper-facing site stays cacheable.
 */
export default function AccountLayout({
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
