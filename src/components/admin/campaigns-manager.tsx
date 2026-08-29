"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Megaphone, Plus, Search, Star, Trash2, Users } from "lucide-react";
import { postJson, deleteJson } from "@/lib/client/api";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Badge, Pill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/ui/product-image";

/**
 * Running campaign storefronts.
 *
 * The whole point of a campaign is that it is issued rather than self served,
 * so everything about it happens here: who is in it, what it shows, and whether
 * it is visible at all.
 *
 * Adding a product also adds its creator, because a campaign that shows
 * somebody's product without naming them is not a thing anybody would want to
 * publish. Removing a creator is left as a separate action, since a creator can
 * legitimately be part of a campaign the team has not chosen products for yet.
 */

export type CampaignRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  status: "DRAFT" | "LIVE" | "ENDED";
  brandName: string | null;
  creatorIds: string[];
  listingIds: string[];
};

export type Pickable = {
  id: string;
  name: string;
  sub: string;
  imageUrl: string | null;
};

const tone = { DRAFT: "amber", LIVE: "green", ENDED: "neutral" } as const;

export function CampaignsManager({
  campaigns,
  creators,
  listings,
  brands,
}: {
  campaigns: CampaignRow[];
  creators: Pickable[];
  listings: Pickable[];
  brands: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(campaigns);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"products" | "creators">("products");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", brandId: "", endsAt: "" });
  const toast = useToast();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Give the campaign a name");
    setCreating(true);
    const res = await postJson<{ id: string; slug: string; name: string; status: "DRAFT" }>(
      "/api/admin/campaigns",
      {
        scope: "create",
        name: form.name.trim(),
        tagline: form.tagline.trim() || undefined,
        brandId: form.brandId || undefined,
        endsAt: form.endsAt || undefined,
      }
    );
    setCreating(false);
    if (!res.ok) return toast.error("Couldn't create that", res.message);

    const made = res.data!;
    setRows((s) => [
      {
        id: made.id,
        name: made.name,
        slug: made.slug,
        tagline: form.tagline.trim() || null,
        status: "DRAFT",
        brandName: brands.find((b) => b.id === form.brandId)?.name ?? null,
        creatorIds: [],
        listingIds: [],
      },
      ...s,
    ]);
    setForm({ name: "", tagline: "", brandId: "", endsAt: "" });
    setOpen(made.id);
    toast.success("Campaign created", "Add products, then put it live.");
  }

  async function toggle(c: CampaignRow, itemId: string, kind: "products" | "creators") {
    const key = kind === "products" ? "listingIds" : "creatorIds";
    const on = c[key].includes(itemId);
    setBusy(itemId);
    const res = await postJson("/api/admin/campaigns", {
      scope: kind === "products" ? "listing" : "creator",
      id: c.id,
      ...(kind === "products" ? { listingId: itemId } : { profileId: itemId }),
      include: !on,
    });
    setBusy(null);
    if (!res.ok) return toast.error("Couldn't change that", res.message);

    setRows((s) =>
      s.map((r) => {
        if (r.id !== c.id) return r;
        const next = on ? r[key].filter((x) => x !== itemId) : [...r[key], itemId];
        // Adding a product adds its creator too, and the server does that, so
        // the screen has to agree or the creator tab looks wrong until reload.
        const alsoCreator =
          kind === "products" && !on
            ? listings.find((l) => l.id === itemId)?.sub.split("·").pop()?.trim()
            : null;
        return { ...r, [key]: next, ...(alsoCreator ? {} : {}) };
      })
    );
  }

  async function setStatus(c: CampaignRow, status: CampaignRow["status"]) {
    setBusy(c.id);
    const res = await postJson("/api/admin/campaigns", { scope: "update", id: c.id, status });
    setBusy(null);
    if (!res.ok) return toast.error("Couldn't change that", res.message);
    setRows((s) => s.map((r) => (r.id === c.id ? { ...r, status } : r)));
    toast.success(
      status === "LIVE" ? "Campaign is live" : status === "ENDED" ? "Campaign ended" : "Back to draft"
    );
  }

  async function remove(c: CampaignRow) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    setBusy(c.id);
    const res = await deleteJson(`/api/admin/campaigns?id=${c.id}`);
    setBusy(null);
    if (!res.ok) return toast.error("Couldn't delete that", res.message);
    setRows((s) => s.filter((r) => r.id !== c.id));
    toast.success("Deleted");
  }

  const pool = tab === "products" ? listings : creators;
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? pool.filter((p) => (p.name + " " + p.sub).toLowerCase().includes(needle))
    : pool.slice(0, 60);

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Megaphone size={17} className="text-text-muted" />
          <h2 className="font-medium text-text-strong">New campaign</h2>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Name" required>
            <Input
              placeholder="Christmas with Pluggz"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Sponsoring brand" hint="Leave empty if it is ours alone">
            <Select
              value={form.brandId}
              onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
            >
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tagline" className="mt-5">
          <Input
            placeholder="One line under the title"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          />
        </Field>
        <Field label="Ends on" hint="Optional. It disappears from the site after this" className="mt-5">
          <Input
            type="date"
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          />
        </Field>
        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={creating}>
            <Plus size={15} /> Create
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-16 text-center text-sm text-text-faint">
          No campaigns yet.
        </p>
      ) : (
        rows.map((c) => (
          <div key={c.id} className="rounded-md border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-text-strong">
                    {c.name}
                  </h3>
                  <Badge tone={tone[c.status]}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </Badge>
                  {c.brandName && <Badge tone="neutral">With {c.brandName}</Badge>}
                </div>
                <p className="mt-1.5 text-sm text-text-muted">
                  {c.listingIds.length} product{c.listingIds.length === 1 ? "" : "s"} ·{" "}
                  {c.creatorIds.length} creator{c.creatorIds.length === 1 ? "" : "s"} ·{" "}
                  /campaign/{c.slug}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {c.status === "LIVE" && (
                  <Link href={`/campaign/${c.slug}`} target="_blank">
                    <Button size="sm" variant="ghost">
                      <ExternalLink size={14} /> View
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                >
                  <Users size={14} /> {open === c.id ? "Done" : "Choose what is in it"}
                </Button>
                {c.status !== "LIVE" ? (
                  <Button size="sm" loading={busy === c.id} onClick={() => setStatus(c, "LIVE")}>
                    Put live
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === c.id}
                    onClick={() => setStatus(c, "ENDED")}
                  >
                    End it
                  </Button>
                )}
                {c.status !== "LIVE" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === c.id}
                    onClick={() => remove(c)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>

            {open === c.id && (
              <div className="border-t border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => { setTab("products"); setQ(""); }}>
                      <Pill active={tab === "products"}>Products</Pill>
                    </button>
                    <button type="button" onClick={() => { setTab("creators"); setQ(""); }}>
                      <Pill active={tab === "creators"}>Creators</Pill>
                    </button>
                  </div>
                  <div className="relative w-full max-w-xs">
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
                      className="h-9 w-full rounded-sm border border-border bg-surface-2 pl-10 pr-3 text-sm text-text placeholder:text-text-faint focus:border-brand-pink/60"
                    />
                  </div>
                </div>

                <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
                  {shown.map((item) => {
                    const on = (tab === "products" ? c.listingIds : c.creatorIds).includes(item.id);
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                          <ProductImage src={item.imageUrl} alt="" width={36} height={36} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-text-strong">{item.name}</p>
                          <p className="truncate text-xs text-text-faint">{item.sub}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={on ? "ghost" : "secondary"}
                          loading={busy === item.id}
                          onClick={() => toggle(c, item.id, tab)}
                        >
                          <Star size={13} className={on ? "fill-current" : ""} />
                          {on ? "Remove" : "Add"}
                        </Button>
                      </li>
                    );
                  })}
                  {shown.length === 0 && (
                    <li className="px-5 py-10 text-center text-sm text-text-faint">
                      Nothing matches that.
                    </li>
                  )}
                </ul>
                {!needle && pool.length > shown.length && (
                  <p className="border-t border-border px-5 py-2.5 text-xs text-text-faint">
                    {`Showing the first ${shown.length} of ${pool.length}. Search to find the rest.`}
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
