import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/creator/dashboard");

  return (
    <DashboardShell user={user} variant="creator">
      {children}
    </DashboardShell>
  );
}
