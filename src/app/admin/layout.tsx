import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Checked against the database, not the token, so a revoked admin loses
  // access on their next request rather than when the cookie expires.
  const access = await requireAdmin();
  if (!access.ok) redirect(access.redirectTo);

  return (
    <DashboardShell user={access.user} variant="admin">
      {children}
    </DashboardShell>
  );
}
