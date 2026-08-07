import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AtSign, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container, Badge } from "@/components/ui/primitives";
import { Aurora } from "@/components/marketing/aurora";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ReleaseForm } from "@/components/creator/release-form";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { compact } from "@/lib/utils";

export const metadata: Metadata = { title: "Release your profile" };

/**
 * Dual consent, creator side.
 *
 * Rachel sets creators up from her existing relationships, but a profile she
 * created must not go public until the creator has seen exactly what was
 * entered about them and agreed to it themselves.
 */
export default async function ReleaseProfilePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const profile = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: {
      handle: true,
      category: true,
      city: true,
      bio: true,
      status: true,
      source: true,
      profileReleasedAt: true,
      user: { select: { name: true, email: true } },
      socials: { select: { platform: true, handle: true, followers: true } },
    },
  });

  if (!profile) redirect("/");
  if (profile.status !== "APPROVED") redirect("/creator/status");
  if (profile.profileReleasedAt) redirect("/creator/dashboard");

  const firstName = profile.user.name.split(" ")[0];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Aurora intensity="soft" className="opacity-60" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <Container className="relative z-10 py-10">
        <div className="mx-auto max-w-xl">
          <Badge tone="brand">One last step</Badge>
          <h1 className="mt-4 font-display text-[clamp(2rem,4vw,2.7rem)] font-semibold leading-tight text-text-strong">
            {firstName}, this profile is waiting for you
          </h1>
          <p className="mt-4 leading-relaxed text-text-muted">
            The Pluggz team set this up from your public profiles. Nothing here
            is visible to shoppers yet — check it reads right, then release it.
          </p>

          <div className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text-strong">
              What we have for you
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <Row label="Name" value={profile.user.name} />
              <Row label="Email" value={profile.user.email} />
              <Row
                label="Storefront"
                value={
                  <span className="inline-flex items-center gap-1">
                    <AtSign size={14} className="text-text-faint" />
                    pluggz.com/@{profile.handle}
                  </span>
                }
              />
              <Row label="Category" value={profile.category} />
              {profile.city && (
                <Row
                  label="Location"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} className="text-text-faint" />
                      {profile.city}
                    </span>
                  }
                />
              )}
              {profile.bio && <Row label="Bio" value={profile.bio} />}
              {profile.socials.length > 0 && (
                <Row
                  label="Platforms"
                  value={
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      {profile.socials.map((s) => (
                        <span key={s.platform}>
                          {s.platform} @{s.handle} ·{" "}
                          <span className="text-text-faint">
                            {compact(s.followers)}
                          </span>
                        </span>
                      ))}
                    </span>
                  }
                />
              )}
            </dl>

            <p className="mt-6 border-t border-border pt-5 text-sm text-text-faint">
              Something wrong? Don&apos;t release it — reply to the invite email
              and the team will correct it first. You can change these details
              yourself once you&apos;re in.
            </p>
          </div>

          <ReleaseForm />
        </div>
      </Container>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-text-faint">{label}</dt>
      <dd className="text-text-strong">{value}</dd>
    </div>
  );
}
