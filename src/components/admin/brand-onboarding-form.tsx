"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CheckCircle2, Ticket, Network } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Path = "network" | "direct" | null;

export function BrandOnboardingForm() {
  const [path, setPath] = useState<Path>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setDone(true);
    toast.success("Brand added", "The commercial relationship is set up.");
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-md border border-accent-green/25 bg-accent-green/[0.06] p-8 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-green/15">
          <CheckCircle2 className="text-accent-green" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Brand onboarded
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-text-muted">
          The brand and its {path === "network" ? "network" : "direct-deal"} tracking
          setup have been saved.
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          onClick={() => {
            setDone(false);
            setPath(null);
          }}
        >
          Add another brand
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Branch question */}
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-sm font-medium text-text">
          Does the brand already run an affiliate or referral programme?
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BranchButton
            active={path === "network"}
            onClick={() => setPath("network")}
            icon={<Network size={18} />}
            title="Yes — on a network"
            desc="Awin, Impact, ShareASale, or a Shopify app"
          />
          <BranchButton
            active={path === "direct"}
            onClick={() => setPath("direct")}
            icon={<Ticket size={18} />}
            title="No — direct deal"
            desc="Pluggz becomes their affiliate directly"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {path && (
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Path-specific fields */}
            {path === "network" ? (
              <Section title="Network details">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Network / platform">
                    <Select defaultValue="">
                      <option value="" disabled>
                        Choose network
                      </option>
                      {["Awin", "Impact", "CJ", "Rakuten", "Partnerize", "Sovrn", "Shopify app"].map(
                        (n) => (
                          <option key={n}>{n}</option>
                        )
                      )}
                    </Select>
                  </Field>
                  <Field label="Publisher / affiliate ID" hint="Once Pluggz is accepted">
                    <Input placeholder="e.g. 1284402" />
                  </Field>
                </div>
                <Field label="Link / deep-link structure" className="mt-5">
                  <Input placeholder="https://track.network.com/click?pid=…&url=…" />
                </Field>
              </Section>
            ) : (
              <Section title="Direct-deal tracking">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Tracking method">
                    <Select defaultValue="Discount code">
                      <option>Discount / promo code per creator</option>
                      <option>Tracking pixel on order confirmation</option>
                    </Select>
                  </Field>
                  <Field label="Attribution window" hint="Separate from returns">
                    <Input placeholder="e.g. 30 days" />
                  </Field>
                </div>
                <Field label="Invoicing / payment details" className="mt-5">
                  <Input placeholder="How the brand pays Pluggz (Stripe / Wise / bank)" />
                </Field>
              </Section>
            )}

            {/* Shared fields */}
            <Section title="Brand details">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Brand name" required>
                  <Input placeholder="Dawsylicious" leftIcon={<Building2 size={16} />} />
                </Field>
                <Field label="Product page URL" required>
                  <Input placeholder="https://brand.com/products/…" />
                </Field>
                <Field label="Commission rate">
                  <Input placeholder="e.g. 11%" />
                </Field>
                <Field label="Return / refund window">
                  <Input placeholder="e.g. 14 days" />
                </Field>
                <Field label="Settlement terms">
                  <Input placeholder="e.g. 30 days after verified" />
                </Field>
                <Field label="Primary contact">
                  <Input placeholder="Name · role · email" />
                </Field>
              </div>
            </Section>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setPath(null)}>
                Back
              </Button>
              <Button type="submit" loading={saving}>
                Add brand
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <h3 className="font-display text-lg font-semibold text-text-strong">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function BranchButton({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-md border p-4 text-left transition-colors",
        active
          ? "border-brand-pink/60 bg-brand-pink/[0.06]"
          : "border-border bg-surface-2/40 hover:border-border-strong"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md",
          active ? "bg-grad-brand text-white" : "bg-surface-3 text-text-muted"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-text-strong">{title}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{desc}</span>
      </span>
    </button>
  );
}
