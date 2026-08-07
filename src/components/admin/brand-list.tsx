"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Check, Users, Building2 } from "lucide-react";
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
  const [form, setForm] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

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

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setInviting(inviting === b.id ? null : b.id)}
            >
              <Mail size={14} /> Invite contact
            </Button>
          </div>

          {inviting === b.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden border-t border-border pt-4"
            >
              <p className="text-sm text-text-muted">
                They&apos;ll get a link to set a password, then see{" "}
                <span className="font-medium text-text-strong">{b.name}</span>
                &apos;s own clicks, sales and commission. Read-only — rates and
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
