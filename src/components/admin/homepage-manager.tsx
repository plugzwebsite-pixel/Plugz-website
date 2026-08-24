"use client";

import { useState } from "react";
import { Search, Star } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, Pill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/ui/product-image";

/**
 * What the homepage says, and what it shows.
 *
 * One screen for both, because they are the same job: somebody setting the
 * front page up for a campaign rewrites the headline and picks the products in
 * the same sitting.
 */

export type Featurable = {
  id: string;
  name: string;
  sub: string;
  imageUrl: string | null;
  featured: boolean;
};

export function HomepageManager({
  content,
  fields,
  products,
  creators,
}: {
  content: Record<string, string>;
  fields: { key: string; label: string; hint: string; fallback: string }[];
  products: Featurable[];
  creators: Featurable[];
}) {
  const [values, setValues] = useState(content);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"products" | "creators">("products");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState({ products, creators });
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  async function saveContent() {
    setSaving(true);
    setErrors({});
    const res = await postJson("/api/admin/homepage", { scope: "content", values });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.errors ?? {});
      toast.error("Couldn't save that", res.message);
      return;
    }
    toast.success("Homepage updated", "Refresh the site to see it.");
  }

  async function toggle(item: Featurable, kind: "products" | "creators") {
    setBusy(item.id);
    const res = await postJson("/api/admin/homepage", {
      scope: kind === "products" ? "product" : "creator",
      ...(kind === "products" ? { listingId: item.id } : { profileId: item.id }),
      featured: !item.featured,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't change that", res.message);
      return;
    }
    setRows((s) => ({
      ...s,
      [kind]: s[kind].map((r) => (r.id === item.id ? { ...r, featured: !r.featured } : r)),
    }));
  }

  const list = rows[tab];
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? list.filter((r) => (r.name + " " + r.sub).toLowerCase().includes(needle))
    : list;
  const featuredCount = list.filter((r) => r.featured).length;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="font-medium text-text-strong">What the homepage says</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Leave a field empty to use the wording the site shipped with.
        </p>

        <div className="mt-5 space-y-5">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} error={errors[f.key]}>
              {f.key === "heroSubtitle" || f.key === "stripText" ? (
                <Textarea
                  rows={2}
                  placeholder={f.fallback || "Empty"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  placeholder={f.fallback || "Empty"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button loading={saving} onClick={saveContent}>
            Save wording
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setTab("products")}>
              <Pill active={tab === "products"}>Featured products</Pill>
            </button>
            <button type="button" onClick={() => setTab("creators")}>
              <Pill active={tab === "creators"}>Featured creators</Pill>
            </button>
          </div>
          <span className="text-sm text-text-faint">{featuredCount} on the homepage</span>
        </div>

        <div className="border-b border-border px-6 py-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "products" ? "Find a product" : "Find a creator"}
              aria-label="Search"
              className="h-10 w-full rounded-sm border border-border bg-surface-2 pl-10 pr-4 text-sm text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
            />
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-faint">
            Nothing matches that.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-6 py-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                  <ProductImage src={item.imageUrl} alt="" width={44} height={44} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-strong">{item.name}</p>
                  <p className="truncate text-xs text-text-faint">{item.sub}</p>
                </div>
                {item.featured && <Badge tone="brand">On the homepage</Badge>}
                <Button
                  size="sm"
                  variant={item.featured ? "ghost" : "secondary"}
                  loading={busy === item.id}
                  onClick={() => toggle(item, tab)}
                >
                  <Star size={14} className={item.featured ? "fill-current" : ""} />
                  {item.featured ? "Remove" : "Feature"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
