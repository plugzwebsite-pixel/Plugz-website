import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Signed-in check only. The status page lives directly under /brand and has to
 * stay reachable by a brand whose partnership is paused — gating it here would
 * bounce them between the dashboard and the explanation forever. The real
 * access check is in (app)/layout.tsx.
 */
export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/brand/dashboard");

  return <>{children}</>;
}
