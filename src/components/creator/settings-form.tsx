"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, ShieldCheck, KeyRound, Info } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { patchJson } from "@/lib/client/api";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";

/**
 * A creator's own profile.
 *
 * This screen used to be a mock. Every field was here, the save button waited
 * seven hundred milliseconds and then said "Changes saved", and nothing ever
 * left the browser. A creator correcting their own name was told it had worked
 * and it had not. It is also why every follower count on the platform reads
 * zero: there was no way to enter one.
 */

const PLATFORMS = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["key"];

export type SocialValue = { platform: string; handle: string; followers: number };

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-text-strong">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SettingsForm({
  name: initialName,
  email,
  handle,
  bio: initialBio,
  city: initialCity,
  socials: initialSocials,
  termsVersion,
}: {
  name: string;
  email: string;
  handle: string;
  bio: string;
  city: string;
  socials: SocialValue[];
  termsVersion: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [city, setCity] = useState(initialCity);
  const [socials, setSocials] = useState<Record<PlatformKey, { handle: string; followers: string }>>(
    () => {
      const start = {
        instagram: { handle: "", followers: "" },
        tiktok: { handle: "", followers: "" },
        youtube: { handle: "", followers: "" },
      };
      for (const s of initialSocials) {
        const key = s.platform as PlatformKey;
        if (key in start) {
          start[key] = {
            handle: s.handle ?? "",
            // A zero is shown as empty rather than as "0", so the box invites a
            // real number instead of looking like it already has one.
            followers: s.followers > 0 ? String(s.followers) : "",
          };
        }
      }
      return start;
    }
  );

  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  function setSocial(key: PlatformKey, field: "handle" | "followers", value: string) {
    setSocials((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await patchJson<{ saved: boolean }>("/api/creator/profile", {
      name,
      bio,
      city,
      socials: PLATFORMS.map((p) => ({
        platform: p.key,
        handle: socials[p.key].handle,
        followers: socials[p.key].followers === "" ? 0 : Number(socials[p.key].followers),
      })),
    });

    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't save that", res.message);
      return;
    }
    toast.success("Saved", "Your profile has been updated.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel title="Public profile" description="How you appear across Pluggz.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field
            label="Storefront handle"
            htmlFor="handle"
            hint="Ask us if you need this changed."
          >
            <Input id="handle" value={handle} leftIcon={<AtSign size={16} />} disabled />
          </Field>
        </div>

        <p className="mt-2 flex items-start gap-2 text-xs text-text-faint">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Your handle is part of every link you have already posted, so
            changing it here would break them. Tell us and we will move them
            across with it.
          </span>
        </p>

        <Field label="City" htmlFor="city" className="mt-5">
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="London"
          />
        </Field>

        <Field label="Bio" htmlFor="bio" className="mt-5">
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell shoppers what you plug…"
            maxLength={400}
          />
        </Field>
      </Panel>

      <Panel
        title="Connected platforms"
        description="Where you post, and how many people follow you there. Shown on your storefront."
      >
        <div className="space-y-3">
          {PLATFORMS.map((p) => (
            <div key={p.key} className="grid grid-cols-[auto_1fr_8rem] items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-2 text-text-muted">
                <p.Icon size={18} />
              </span>
              <Input
                aria-label={`${p.label} handle`}
                placeholder={`${p.label} handle`}
                value={socials[p.key].handle}
                onChange={(e) => setSocial(p.key, "handle", e.target.value)}
              />
              <Input
                aria-label={`${p.label} followers`}
                placeholder="Followers"
                type="number"
                min={0}
                value={socials[p.key].followers}
                onChange={(e) => setSocial(p.key, "followers", e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-faint">
          Leave a handle blank to remove that platform. Follower numbers are
          yours to keep up to date, and we check them from time to time.
        </p>
      </Panel>

      <Panel
        title="Membership & terms"
        description="Your Pluggz Creator Terms & Membership Agreement."
      >
        <div className="flex items-start gap-3 rounded-sm border border-accent-green/25 bg-accent-green/[0.05] p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-accent-green" size={18} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-strong">
                Agreement accepted
              </p>
              {termsVersion && <Badge tone="green">v{termsVersion}</Badge>}
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Accepted and timestamped when you applied. Admin-added creators
              release their profile here before it goes live.
            </p>
            <Link
              href="/legal/creator-terms"
              className="mt-2 inline-block text-sm font-medium text-brand-pink hover:underline"
            >
              Review agreement →
            </Link>
          </div>
        </div>
      </Panel>

      <Panel title="Account" description="Your sign-in details.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" hint="Contact support to change your email.">
            <Input id="email" defaultValue={email} disabled />
          </Field>
          <div className="flex items-end">
            <Link href="/forgot-password" className="w-full">
              <Button type="button" variant="secondary" className="w-full">
                <KeyRound size={15} /> Change password
              </Button>
            </Link>
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
