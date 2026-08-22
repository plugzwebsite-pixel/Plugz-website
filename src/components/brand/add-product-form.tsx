"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ImagePlus, Link2, X } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/ui/product-image";
import { gbpFromPence } from "@/lib/utils";

/**
 * A brand adding one of its own products.
 *
 * Pasting the product's own address does most of the work, because the brand's
 * shop already holds the name, the picture, the description and the price, and
 * asking somebody to retype all four is how a catalogue ends up half filled in.
 *
 * Everything read that way can still be overridden, and the picture can be
 * uploaded outright, because a good number of shops render their price and
 * their photographs with script after the page loads and defeat any automatic
 * read. Those brands would otherwise be unable to use this screen at all.
 */

type Added = {
  id: string;
  name: string;
  imageUrl: string | null;
  pricePence: number | null;
  category: string;
  alreadyExisted: boolean;
};

export function BrandAddProductForm({ categories }: { categories: string[] }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [added, setAdded] = useState<Added[]>([]);
  const [f, setF] = useState({
    url: "",
    category: categories[0] ?? "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads/product-image", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Couldn't use that image", json?.message);
        return;
      }
      setF((s) => ({ ...s, imageUrl: json.data.url }));
      toast.success("Image ready");
    } catch {
      toast.error("Couldn't reach the server", "Try again in a moment.");
    } finally {
      setUploading(false);
      // Cleared so choosing the same file twice still fires a change.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.url.trim()) {
      toast.error("Paste the address of the product page");
      return;
    }

    // Typed as pounds because that is what is on their own page; stored as
    // pence, because money in a database should never be a floating point.
    const pounds = Number.parseFloat(f.price.replace(/[^0-9.]/g, ""));
    const pricePence =
      f.price.trim() && Number.isFinite(pounds) ? Math.round(pounds * 100) : undefined;

    setSaving(true);
    const res = await postJson<Added>("/api/brand/products", {
      url: f.url.trim(),
      category: f.category || undefined,
      name: f.name.trim() || undefined,
      description: f.description.trim() || undefined,
      pricePence,
      imageUrl: f.imageUrl.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't add that product", res.message);
      return;
    }

    const made = res.data!;
    setAdded((list) => [made, ...list]);
    // The category stays. Products are added a run at a time and re-picking it
    // for every one of thirty is the sort of thing that makes people stop.
    setF((s) => ({ ...s, url: "", name: "", description: "", price: "", imageUrl: "" }));

    toast.success(
      made.alreadyExisted ? "Already in the catalogue" : "Product added",
      made.alreadyExisted
        ? `${made.name} was there already.`
        : `${made.name} is ready for creators to plug.`
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-md border border-border bg-surface p-6">
        <Field
          label="Product page address"
          hint="The page on your own shop. We read the name, picture, description and price from it."
          required
        >
          <Input
            placeholder="https://yourshop.com/products/..."
            leftIcon={<Link2 size={16} />}
            value={f.url}
            onChange={(e) => set("url")(e.target.value)}
          />
        </Field>

        <Field label="Category" className="mt-5">
          <Select value={f.category} onChange={(e) => set("category")(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <div className="mt-6 rounded-sm border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text-strong">
            Fill these in if your shop hides them
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Some shops load the price and the photographs with script, which we
            cannot read. Anything you put here is used instead of what we found.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Name">
              <Input
                placeholder="Leave blank to use your page's"
                value={f.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </Field>
            <Field label="Price">
              <Input
                placeholder="e.g. 49.99"
                value={f.price}
                onChange={(e) => set("price")(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description" className="mt-5">
            <Textarea
              rows={3}
              placeholder="A line or two a shopper would want to read"
              value={f.description}
              onChange={(e) => set("description")(e.target.value)}
            />
          </Field>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-text">Photograph</p>
            {f.imageUrl ? (
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                  <ProductImage src={f.imageUrl} alt="" width={80} height={80} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setF((s) => ({ ...s, imageUrl: "" }))}
                >
                  <X size={14} /> Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus size={15} />
                {uploading ? "Uploading" : "Upload a photograph"}
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <p className="mt-2 text-xs text-text-faint">
              JPG, PNG or WebP, up to 10MB. Leave it empty to use the picture from
              your own page.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={saving}>
            {saving ? "Reading your page" : "Add product"}
          </Button>
        </div>
      </form>

      {added.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-border bg-surface p-6"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-accent-green" />
            <h2 className="font-medium text-text-strong">Added just now</h2>
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            These are in the catalogue and creators can now add them to their
            storefronts. Nothing is public until one of them does.
          </p>

          <ul className="mt-5 space-y-3">
            {added.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-sm border border-border bg-surface-2 p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                  <ProductImage src={p.imageUrl} alt={p.name} width={56} height={56} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-strong">{p.name}</p>
                  <p className="truncate text-xs text-text-faint">{p.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.pricePence ? (
                    <span className="text-sm text-text-muted">
                      {gbpFromPence(p.pricePence)}
                    </span>
                  ) : (
                    <Badge tone="amber">No price</Badge>
                  )}
                  {!p.imageUrl && <Badge tone="amber">No photo</Badge>}
                  {p.alreadyExisted && <Badge tone="neutral">Already there</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
