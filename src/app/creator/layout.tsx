import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Signed-in check only. The status and release pages live directly under
 * /creator and must stay reachable to creators who are pending, declined or
 * still waiting to release their profile, and gating them here would bounce those
 * people in a loop. The real access check sits in (app)/layout.tsx.
 */
export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/creator/dashboard");

  return <>{children}</>;
}
