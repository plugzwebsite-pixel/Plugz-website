"use client";

import { useState } from "react";
import Link from "next/link";
import { AtSign, ShieldCheck, KeyRound } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";

const platforms = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "youtube", label: "YouTube", Icon: YouTubeIcon },
];

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
  name,
  email,
  handle,
}: {
  name: string;
  email: string;
  handle: string;
}) {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast.success("Changes saved", "Your profile has been updated.");
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Panel title="Public profile" description="How you appear across Plugz.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" htmlFor="name">
            <Input id="name" defaultValue={name} />
          </Field>
          <Field label="Storefront handle" htmlFor="handle" hint="pluggz.com/@handle">
            <Input
              id="handle"
              defaultValue={handle}
              leftIcon={<AtSign size={16} />}
            />
          </Field>
        </div>
        <Field label="Bio" htmlFor="bio" className="mt-5">
          <Textarea
            id="bio"
            defaultValue="High-street, styled sharp. Sharing the pieces I actually wear."
            placeholder="Tell shoppers what you plug…"
          />
        </Field>
      </Panel>

      <Panel
        title="Connected platforms"
        description="Where you post — used to verify your reach and drive traffic back to your storefront."
      >
        <div className="space-y-3">
          {platforms.map((p) => (
            <div key={p.key} className="grid grid-cols-[auto_1fr_7rem] items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-surface-2 text-text-muted">
                <p.Icon size={18} />
              </span>
              <Input placeholder={`${p.label} handle`} defaultValue={p.key === "instagram" ? handle : ""} />
              <Input placeholder="Followers" type="number" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Membership & terms"
        description="Your Plugz Creator Terms & Membership Agreement."
      >
        <div className="flex items-start gap-3 rounded-sm border border-accent-green/25 bg-accent-green/[0.05] p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-accent-green" size={18} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-strong">
                Agreement accepted
              </p>
              <Badge tone="green">v2026-07-01</Badge>
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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost">
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
