import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { SettingsForm } from "@/components/creator/settings-form";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function CreatorSettingsPage() {
  const user = await getSession();
  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Manage your public profile, connected platforms and account.
      </p>
      <SettingsForm
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        handle={user?.handle ?? ""}
      />
    </div>
  );
}
