import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/admin/approvals");
  if (user.role !== "ADMIN") redirect("/creator/dashboard");

  return (
    <DashboardShell user={user} variant="admin">
      {children}
    </DashboardShell>
  );
}
