"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  cover: string | null;
  sortOrder: number;
  inNav: boolean;
  active: boolean;
  products: number;
  bannerImageUrl: string | null;
  bannerHref: string | null;
  bannerLabel: string | null;
  bannerActive: boolean;
};

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const inNav = categories.filter((c) => c.inNav && c.active).length;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-text-muted">
        The lifestyle categories: the tiles on the homepage and the pages behind
        them. Order them, choose which appear in the header, and hide one
        without losing the products in it. Each category also has a banner slot
        you can sell to a sponsor.
      </p>

      <AddCategory nextOrder={categories.length * 10} />

      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Categories
          </h2>
          <span className="text-sm text-text-faint">
            {categories.length} total · {inNav} in the header
          </span>
        </div>

        {categories.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            None yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <CategoryItem key={c.id} category={c} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddCategory({ nextOrder }: { nextOrder: number }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [cover, setCover] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function add() {
    setSaving(true);
    const res = await postJson("/api/admin/categories", {
      name: name.trim(),
      emoji: emoji.trim(),
      coverUrl: cover.trim(),
      sortOrder: nextOrder,
      inNav: false,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't add that", res.message);
      return;
    }
    toast.success("Category added", `${name.trim()} is live, at the end of the list`);
    setName("");
    setEmoji("");
    setCover("");
    router.refresh();
  }

  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-text-strong">
        Add a category
      </h2>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_6rem_2fr_auto]">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="c-name">
            Name
          </label>
          <Input
            id="c-name"
            value={name}
            maxLength={48}
            placeholder="Party Season"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="c-emoji">
            Emoji
          </label>
          <Input
            id="c-emoji"
            value={emoji}
            maxLength={8}
            placeholder="🥂"
            onChange={(e) => setEmoji(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="c-cover">
            Tile photograph, taller than it is wide
          </label>
          <Input
            id="c-cover"
            value={cover}
            placeholder="https://"
            onChange={(e) => setCover(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={add} loading={saving} disabled={name.trim().length < 2}>
            <Plus size={15} /> Add
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-faint">
        Leave the photograph blank and the tile shows drawn artwork, which looks
        better than a small image stretched to fill it.
      </p>
    </div>
  );
}

function CategoryItem({ category: c }: { category: CategoryRow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(c.name);
  const [emoji, setEmoji] = useState(c.emoji);
  const [cover, setCover] = useState(c.cover ?? "");
  const [sortOrder, setSortOrder] = useState(c.sortOrder);
  const [inNav, setInNav] = useState(c.inNav);
  const [bannerImageUrl, setBannerImageUrl] = useState(c.bannerImageUrl ?? "");
  const [bannerHref, setBannerHref] = useState(c.bannerHref ?? "");
  const [bannerLabel, setBannerLabel] = useState(c.bannerLabel ?? "");
  const [bannerActive, setBannerActive] = useState(c.bannerActive);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const renaming = name.trim() !== c.name;
  const dirty =
    renaming ||
    emoji !== c.emoji ||
    cover !== (c.cover ?? "") ||
    sortOrder !== c.sortOrder ||
    inNav !== c.inNav ||
    bannerImageUrl !== (c.bannerImageUrl ?? "") ||
    bannerHref !== (c.bannerHref ?? "") ||
    bannerLabel !== (c.bannerLabel ?? "") ||
    bannerActive !== c.bannerActive;

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, ...body }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't save that", payload?.message);
      return false;
    }
    toast.success(message);
    router.refresh();
    return true;
  }

  async function save() {
    const done = await patch(
      {
        name: name.trim(),
        emoji: emoji.trim(),
        coverUrl: cover.trim(),
        sortOrder,
        inNav,
        bannerImageUrl: bannerImageUrl.trim(),
        bannerHref: bannerHref.trim(),
        bannerLabel: bannerLabel.trim(),
        bannerActive,
      },
      renaming && c.products > 0
        ? `Renamed, and ${c.products} product${c.products === 1 ? "" : "s"} moved with it`
        : "Category saved"
    );
    if (done) setOpen(false);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/admin/categories?id=${c.id}`, { method: "DELETE" });
    const payload = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't remove that", payload?.message);
      return;
    }
    toast.success("Category removed");
    router.refresh();
  }

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-2 text-lg">
          {c.emoji || <ImageIcon size={15} className="text-text-faint" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text-strong">{c.name}</span>
            {!c.active && <Badge tone="neutral">Hidden</Badge>}
            {c.inNav && c.active && <Badge tone="brand">In the header</Badge>}
            {c.bannerActive && c.bannerImageUrl && (
              <Badge tone="cyan">
                <Megaphone size={11} /> Sponsored
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-faint">
            /category/{c.slug} · {c.products} product{c.products === 1 ? "" : "s"} ·
            position {c.sortOrder}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/category/${c.slug}`}
            aria-label={`Open the ${c.name} page`}
            className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
          >
            <ExternalLink size={15} />
          </Link>
          <button
            onClick={() => patch({ active: !c.active }, c.active ? "Hidden from the site" : "Back on the site")}
            disabled={busy}
            aria-label={c.active ? `Hide ${c.name}` : `Show ${c.name}`}
            className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
          >
            {c.active ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            onClick={remove}
            disabled={busy || c.products > 0}
            title={c.products > 0 ? "Has products in it. Hide it instead." : undefined}
            aria-label={`Remove ${c.name}`}
            className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-faint"
          >
            <Trash2 size={15} />
          </button>
          <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Edit"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 rounded-sm border border-border bg-surface-2/40 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_5rem_5rem]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`n-${c.id}`}>
                Name
              </label>
              <Input id={`n-${c.id}`} value={name} maxLength={48} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`e-${c.id}`}>
                Emoji
              </label>
              <Input id={`e-${c.id}`} value={emoji} maxLength={8} onChange={(e) => setEmoji(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`o-${c.id}`}>
                Position
              </label>
              <Input
                id={`o-${c.id}`}
                type="number"
                min={0}
                max={999}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`c-${c.id}`}>
              Tile photograph
            </label>
            <Input
              id={`c-${c.id}`}
              value={cover}
              placeholder="https://"
              onChange={(e) => setCover(e.target.value)}
            />
          </div>

          <div className="mt-3">
            <Checkbox
              checked={inNav}
              onChange={(e) => setInNav(e.target.checked)}
              label="Show in the header. There is room for about three."
            />
          </div>

          {renaming && c.products > 0 && (
            <p className="mt-3 rounded-sm border border-accent-gold/30 bg-accent-gold/[0.06] p-3 text-sm text-text-muted">
              {`Renaming this moves all ${c.products} products with it, so none are left behind on a page that no longer exists.`}
            </p>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-text-faint" />
              <h3 className="text-sm font-semibold text-text-strong">Sponsor banner</h3>
            </div>
            <p className="mt-1 text-xs text-text-faint">
              Shown at the top of this category page. Fill it in to mock a
              placement up for a prospect, then switch it on once they sign.
            </p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`bi-${c.id}`}>
                  Banner image
                </label>
                <Input
                  id={`bi-${c.id}`}
                  value={bannerImageUrl}
                  placeholder="https://"
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`bh-${c.id}`}>
                  Where it links
                </label>
                <Input
                  id={`bh-${c.id}`}
                  value={bannerHref}
                  placeholder="https://"
                  onChange={(e) => setBannerHref(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor={`bl-${c.id}`}>
                Wording beside it
              </label>
              <Input
                id={`bl-${c.id}`}
                value={bannerLabel}
                maxLength={80}
                placeholder="In partnership with Airalo"
                onChange={(e) => setBannerLabel(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <Checkbox
                checked={bannerActive}
                disabled={!bannerImageUrl.trim()}
                onChange={(e) => setBannerActive(e.target.checked)}
                label={
                  bannerImageUrl.trim()
                    ? "Live on the category page"
                    : "Add an image before switching this on"
                }
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
