import { getSession } from "@/lib/auth/session";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={user} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
