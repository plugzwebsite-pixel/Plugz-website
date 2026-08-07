"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

export function ReleaseForm() {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function release() {
    if (!accepted) return;
    setBusy(true);
    const res = await postJson("/api/creator/release", { acceptTerms: true });
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't release your profile", res.message);
      return;
    }
    toast.success("Your storefront is live", "Shoppers can find you now.");
    router.replace("/creator/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-8">
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2/40 p-4 text-left">
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm leading-relaxed text-text-muted">
          I accept the{" "}
          <Link
            href="/legal/creator-terms"
            target="_blank"
            className="font-medium text-brand-pink hover:underline"
          >
            Pluggz Creator Terms &amp; Membership Agreement
          </Link>
          , and I confirm this profile is mine and I want it to go live on
          Pluggz.
        </span>
      </label>

      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={!accepted}
        loading={busy}
        onClick={release}
      >
        <ShieldCheck size={17} /> Release my profile
      </Button>

      <p className="mt-3 text-xs text-text-faint">
        Your acceptance is recorded with the date, time and agreement version.
        Nothing about your profile is public until you do this.
      </p>
    </div>
  );
}
