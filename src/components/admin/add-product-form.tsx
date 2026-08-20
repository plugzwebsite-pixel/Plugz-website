"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Link2, Package } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ProductImage } from "@/components/ui/product-image";
import { gbpFromPence } from "@/lib/utils";

/**
 * Adding a brand's products to the catalogue.
 *
 * Paste the address of the product page and the shop's own page supplies the
 * title, the picture and the price, which is the same trick creators already
 * get and there is no reason an administrator should have to type it by hand.
 *
 * The three override fields exist because a good number of shops defeat an
 * automatic read: Zara, Sephora, Boots, Louis Vuitton and plenty of others
 * render their price with script after the page loads. Rather than refuse those
 * brands, the product is created with whatever was found and anything missing
 * can be typed in.
 */

type Created = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  pricePence: number | null;
  category: string;
  sourceUrl: string;
  alreadyExisted: boolean;
};

export function AddProductForm({
  brands,
  categories,
}: {
  brands: { id: string; name: string; productCount: number }[];
  categories: string[];
}) {
  const [saving, setSaving] = useState(false);
  const [made, setMade] = useState<Created[]>([]);
  const [f, setF] = useState({
    brandId: brands[0]?.id ?? "",
    url: "",
    category: categories[0] ?? "",
    name: "",
    price: "",
    imageUrl: "",
  });
  const toast = useToast();

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.brandId) return toast.error("Choose a brand");
    if (!f.url.trim()) return toast.error("Paste the product page address");

    // Typed as pounds because that is what is on the shop's page; stored as
    // pence because money in a database should never be a floating point.
    const pounds = Number.parseFloat(f.price.replace(/[^0-9.]/g, ""));
    const pricePence =
      f.price.trim() && Number.isFinite(pounds) ? Math.round(pounds * 100) : undefined;

    setSaving(true);
    const res = await postJson<Created>("/api/admin/products", {
      brandId: f.brandId,
      url: f.url.trim(),
      category: f.category || undefined,
      name: f.name.trim() || undefined,
      pricePence,
      imageUrl: f.imageUrl.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't add that product", res.message);
      return;
    }

    const made = res.data!;
    setMade((list) => [made, ...list]);
    // Only the address and the corrections are cleared. The brand and category
    // stay, because products are added a shop at a time and re-picking them for
    // every one of thirty items is the sort of thing that makes people stop.
    setF((s) => ({ ...s, url: "", name: "", price: "", imageUrl: "" }));

    if (made.alreadyExisted) {
      toast.success("Already in the catalogue", `${made.name} was there already.`);
    } else {
      toast.success("Product added", `${made.name} is ready for creators to plug.`);
    }
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center">
        <Package size={22} className="mx-auto text-text-faint" />
        <p className="mt-3 text-text-muted">There are no brands yet.</p>
        <Link href="/admin/brands/new">
          <Button className="mt-4" size="sm">
            Add a brand first
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-md border border-border bg-surface p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Brand" required>
            <Select value={f.brandId} onChange={(e) => set("brandId")(e.target.value)}>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.productCount})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set("category")(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Product page address"
          hint="The page on the brand's own shop, not a search result"
          required
          className="mt-5"
        >
          <Input
            placeholder="https://brand.com/products/…"
            leftIcon={<Link2 size={16} />}
            value={f.url}
            onChange={(e) => set("url")(e.target.value)}
          />
        </Field>

        <details className="mt-5 rounded-sm border border-border bg-surface-2 p-4">
          <summary className="cursor-pointer text-sm text-text-muted">
            Some shops hide their price and picture from us. Fill these in if the
            product comes through incomplete.
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Field label="Name">
              <Input
                placeholder="Leave blank to use the shop's"
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
            <Field label="Image address">
              <Input
                placeholder="https://…"
                value={f.imageUrl}
                onChange={(e) => set("imageUrl")(e.target.value)}
              />
            </Field>
          </div>
        </details>

        <div className="mt-6 flex justify-end">
          <Button type="submit" loading={saving}>
            {saving ? "Reading the page…" : "Add product"}
          </Button>
        </div>
      </form>

      {made.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-border bg-surface p-6"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-accent-green" />
            <h2 className="font-medium text-text-strong">
              Added in this session
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            These are in the catalogue and will appear under &ldquo;available to
            plug&rdquo;. They are not on anyone&apos;s storefront until a creator
            picks one up, so nothing is public yet.
          </p>

          <ul className="mt-5 space-y-3">
            {made.map((p) => (
              <li
                key={p.id + p.sourceUrl}
                className="flex items-center gap-4 rounded-sm border border-border bg-surface-2 p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-surface-3">
                  <ProductImage src={p.imageUrl} alt={p.name} width={56} height={56} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-strong">{p.name}</p>
                  <p className="truncate text-xs text-text-faint">
                    {p.brand} · {p.category}
                  </p>
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
