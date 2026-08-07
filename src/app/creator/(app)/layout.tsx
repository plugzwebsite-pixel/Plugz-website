import { redirect } from "next/navigation";
import { checkCreatorAccess } from "@/lib/auth/access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function CreatorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkCreatorAccess();
  if (!access.ok) redirect(access.redirectTo);

  return (
    <DashboardShell user={access.user} variant="creator">
      {children}
    </DashboardShell>
  );
}
