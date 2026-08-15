"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Check, Users, Building2, KeyRound, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { compact, gbpFromPence } from "@/lib/utils";
import { postJson } from "@/lib/client/api";

export type BrandRow = {
  id: string;
  name: string;
  status: string;
  commissionRate: number;
  returnWindowDays: number;
  productCount: number;
  clicks: number;
  salesPence: number;
  contacts: { name: string; email: string }[];
};

const statusTone: Record<string, "green" | "amber" | "neutral"> = {
  ACTIVE: "green",
  DRAFT: "amber",
  PAUSED: "neutral",
};

export function BrandList({ initial }: { initial: BrandRow[] }) {
  const [brands, setBrands] = useState(initial);
  const [inviting, setInviting] = useState<string | null>(null);
  const [creds, setCreds] = useState<
    { brandId: string; key: string; secret: string; rolled: boolean } | null
  >(null);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  /**
   * Issue the key and secret a brand signs its sale postbacks with.
   *
   * The secret comes back once and is shown once. After this screen it exists
   * only as the stored copy used to verify their signatures.
   */
  async function issueCredentials(brandId: string, brandName: string) {
    if (
      !window.confirm(
        `Issue tracking credentials for ${brandName}?

` +
          "The secret is shown once and cannot be retrieved afterwards. " +
          "If this brand already has credentials, the old pair stops working immediately."
      )
    ) {
      return;
    }
    setIssuing(brandId);
    const res = await postJson<{
      key: string;
      secret: string;
      rolled: boolean;
    }>(`/api/admin/brands/${brandId}/credentials`, {});
    setIssuing(null);

    if (!res.ok) {
      toast.error("Couldn't issue credentials", res.message);
      return;
    }
    setCreds({ brandId, ...res.data! });
    toast.success(
      res.data!.rolled ? "Credentials rolled" : "Credentials issued",
      "Copy the secret now. It isn't shown again."
    );
  }

  async function invite(brandId: string) {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Enter their name and email");
      return;
    }
    setBusy(true);
    const res = await postJson(`/api/admin/brands/${brandId}/invite`, form);
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't send the invite", res.message);
      return;
    }
    setBrands((bs) =>
      bs.map((b) =>
        b.id === brandId
          ? { ...b, contacts: [...b.contacts, { name: form.name, email: form.email }] }
          : b
      )
    );
    setInviting(null);
    setForm({ name: "", email: "" });
    toast.success("Invite sent", `${form.email} can now set a password.`);
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-20 text-center">
        <p className="text-sm text-text-muted">
          No brands yet. Add one and it appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {brands.map((b) => (
        <div key={b.id} className="rounded-md border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-2 text-text-muted">
                  <Building2 size={17} />
                </span>
                <h3 className="font-display text-lg font-semibold text-text-strong">
                  {b.name}
                </h3>
                <Badge tone={statusTone[b.status] ?? "neutral"}>
                  {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {b.commissionRate}% · {b.returnWindowDays}-day returns ·{" "}
                {b.productCount} product{b.productCount === 1 ? "" : "s"} ·{" "}
                {compact(b.clicks)} clicks
                {b.salesPence > 0 && ` · ${gbpFromPence(b.salesPence)} sales`}
              </p>

              {b.contacts.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Users size={13} className="text-text-faint" />
                  {b.contacts.map((c) => (
                    <span
                      key={c.email}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-2 px-3 py-1 text-xs text-text-muted"
                    >
                      <Check size={11} className="text-accent-green" />
                      {c.email}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setInviting(inviting === b.id ? null : b.id)}
              >
                <Mail size={14} /> Invite contact
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={issuing === b.id}
                onClick={() => issueCredentials(b.id, b.name)}
              >
                <KeyRound size={14} /> Tracking keys
              </Button>
            </div>
          </div>

          {creds?.brandId === b.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden rounded-md border border-brand-pink/40 bg-brand-pink/[0.04] p-4"
            >
              <p className="text-sm font-medium text-text-strong">
                {creds.rolled
                  ? "New credentials. The previous pair has stopped working"
                  : "Credentials issued"}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {`Send these to ${b.name} with the integration guide. The signing
                secret is not stored anywhere you can read it again. If it is
                lost, issue a new pair.`}
              </p>

              <div className="mt-3 space-y-2">
                {(
                  [
                    ["Endpoint", "https://pluggzofficial.co.uk/api/track/sale"],
                    ["Key", creds.key],
                    ["Signing secret", creds.secret],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs text-text-faint">
                      {label}
                    </span>
                    <code className="min-w-0 flex-1 truncate rounded bg-surface-2 px-2 py-1.5 font-mono text-xs text-text">
                      {value}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(value);
                        toast.success("Copied");
                      }}
                    >
                      <Copy size={13} />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => setCreds(null)}
              >
                Done, I&apos;ve copied them
              </Button>
            </motion.div>
          )}

          {inviting === b.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden border-t border-border pt-4"
            >
              <p className="text-sm text-text-muted">
                They&apos;ll get a link to set a password, then see{" "}
                <span className="font-medium text-text-strong">{b.name}</span>
                &apos;s own clicks, sales and commission. Read-only: rates and
                campaigns stay with you.
              </p>
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <Input
                  placeholder="Contact name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="name@brand.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && !busy && invite(b.id)}
                />
                <Button loading={busy} onClick={() => invite(b.id)} className="shrink-0">
                  Send invite
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}
