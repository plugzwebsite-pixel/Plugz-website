import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/creator/settings-form";
import { AvatarUpload } from "@/components/creator/avatar-upload";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function CreatorSettingsPage() {
  const user = await getSession();
  const profile = user
    ? await db.creatorProfile.findUnique({
        where: { userId: user.id },
        select: { avatarUrl: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Manage your public profile, connected platforms and account.
      </p>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-text">Your photo</h2>
        <p className="mt-1 mb-5 text-sm text-text-muted">
          This is what shoppers see on your storefront and beside every product
          you plug.
        </p>
        <AvatarUpload
          name={user?.name ?? ""}
          currentUrl={profile?.avatarUrl ?? null}
        />
      </div>
      <SettingsForm
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        handle={user?.handle ?? ""}
      />
    </div>
  );
}
