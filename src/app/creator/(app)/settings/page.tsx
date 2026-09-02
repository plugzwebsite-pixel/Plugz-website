import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/creator/settings-form";
import { AvatarUpload } from "@/components/creator/avatar-upload";

export const metadata: Metadata = { title: "Profile & settings" };
export const dynamic = "force-dynamic";

export default async function CreatorSettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/creator/settings");

  // Read what is actually stored. The form used to be handed a name and a
  // handle and nothing else, so the bio it displayed was a line of sample copy
  // written into the component and shown identically to every creator.
  const profile = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: {
      avatarUrl: true,
      handle: true,
      bio: true,
      city: true,
      termsVersion: true,
      socials: {
        select: { platform: true, handle: true, followers: true },
        orderBy: { platform: "asc" },
      },
    },
  });

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
          name={user.name ?? ""}
          currentUrl={profile?.avatarUrl ?? null}
        />
      </div>

      <SettingsForm
        name={user.name ?? ""}
        email={user.email ?? ""}
        handle={profile?.handle ?? user.handle ?? ""}
        bio={profile?.bio ?? ""}
        city={profile?.city ?? ""}
        socials={(profile?.socials ?? []).map((s) => ({
          platform: s.platform,
          handle: s.handle,
          followers: s.followers,
        }))}
        termsVersion={profile?.termsVersion ?? null}
      />
    </div>
  );
}
