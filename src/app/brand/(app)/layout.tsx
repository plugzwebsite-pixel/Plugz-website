import { redirect } from "next/navigation";
import { checkBrandAccess } from "@/lib/auth/access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function BrandAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkBrandAccess();
  if (!access.ok) redirect(access.redirectTo);

  return (
    <DashboardShell user={access.user} variant="brand">
      {children}
    </DashboardShell>
  );
}
