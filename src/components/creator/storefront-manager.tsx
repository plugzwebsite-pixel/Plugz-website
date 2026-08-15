"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Link2,
  Plus,
  Bell,
  Sparkles,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MousePointerClick,
  ImageOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn, compact, gbpFromPence } from "@/lib/utils";
import { postJson } from "@/lib/client/api";

/**
 * A product thumbnail that copes with the brand's own photography.
 *
 * These URLs point straight at the shop that sells the item, so some are
 * missing, some are a megabyte of full-resolution studio shot going into a
 * 40px box, and some simply stop resolving when the brand reorganises its CDN.
 * All three used to leave an empty grey square with no explanation.
 */
function ProductThumb({
  src,
  size,
  className,
}: {
  src: string | null;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // A photo that 404s during the server-rendered pass has already fired its
  // error event by the time React attaches the handler, so onError alone leaves
  // the broken ones as blank squares. Re-check whatever the browser managed to
  // load as each image mounts.
  const check = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <span className={cn("shrink-0 overflow-hidden bg-surface-2", className)}>
      {src && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={check}
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setFailed(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-text-faint">
          <ImageOff size={size > 44 ? 16 : 14} />
        </span>
      )}
    </span>
  );
}

type Listing = {
  id: string;
  slug: string;
  live: boolean;
  product: {
    name: string;
    imageUrl: string | null;
    pricePence: number | null;
    category: string;
    brand: { name: string };
  };
  trackingLink: {
    code: string;
    clickCount: number;
    isPlaceholder: boolean;
    discountCode: string | null;
  } | null;
};

type Available = {
  id: string;
  name: string;
  imageUrl: string | null;
  pricePence: number | null;
  brand: { name: string };
  _count: { creatorProducts: number };
};

export function StorefrontManager({ handle }: { handle: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [available, setAvailable] = useState<Available[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/products").then((r) => r.json());
    if (res?.ok) {
      setListings(res.data.items ?? []);
      setAvailable(res.data.available ?? []);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addByUrl() {
    const value = url.trim();
    if (!value) return;
    setLoading(true);
    const res = await postJson("/api/creator/products", { url: value });
    setLoading(false);

    if (!res.ok) {
      toast.error("Couldn't add that", res.message);
      return;
    }
    setUrl("");
    await load();
    toast.success("Product added", "Page built and your tracking link is ready.");
  }

  async function claim(productId: string) {
    setClaiming(productId);
    const res = await postJson("/api/creator/products", { productId });
    setClaiming(null);
    if (!res.ok) {
      toast.error("Couldn't add that", res.message);
      return;
    }
    await load();
    toast.success("Added to your storefront");
  }

  async function remove(id: string) {
    const previous = listings;
    setListings((l) => l.filter((x) => x.id !== id));
    const res = await fetch(`/api/creator/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setListings(previous);
      toast.error("Couldn't remove that");
      return;
    }
    void load();
  }

  async function copyLink(code: string) {
    const link = `${window.location.origin}/go/${code}`;
    await navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
    toast.success("Link copied", "Paste it into your bio, story or caption.");
  }

  return (
    <div className="space-y-6">
      {/* Paste a URL */}
      <div className="rounded-md border border-border bg-surface p-5">
        <label className="text-sm font-medium text-text" htmlFor="product-url">
          Add a product by URL
        </label>
        <p className="mt-1 text-xs text-text-faint">
          Paste any brand product page and we&apos;ll pull the title, image and
          price, build the page and generate your tracking link.
        </p>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <Input
            id="product-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://brand.com/products/linen-co-ord"
            leftIcon={<Link2 size={16} />}
            onKeyDown={(e) => e.key === "Enter" && !loading && addByUrl()}
          />
          <Button onClick={addByUrl} loading={loading} className="shrink-0">
            <Plus size={16} /> Add product
          </Button>
        </div>
      </div>

      {/* Central link database */}
      <AnimatePresence>
        {available.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md border border-brand-pink/25 bg-brand-pink/[0.05] p-5"
          >
            <div className="flex items-center gap-2 text-text-strong">
              <Bell size={16} className="text-brand-pink" />
              <h3 className="font-semibold">Available to plug</h3>
              <Badge tone="brand">{available.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Already in the Pluggz catalogue. Add one and you get your own page
              and link for it.
            </p>
            <div className="mt-4 space-y-2.5">
              {available.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between gap-4 rounded-sm border border-border bg-surface p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumb
                      src={a.imageUrl}
                      size={40}
                      className="h-10 w-10 rounded"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-strong">
                        {a.name}
                      </p>
                      <p className="text-xs text-text-faint">
                        {a.brand.name}
                        {a.pricePence !== null && ` · ${gbpFromPence(a.pricePence)}`}
                        {a._count.creatorProducts > 0 &&
                          ` · ${a._count.creatorProducts} creator${a._count.creatorProducts === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={claiming === a.id}
                    onClick={() => claim(a.id)}
                  >
                    <Sparkles size={14} /> Add
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live listings */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-text-strong">
            Your storefront links
          </h3>
          <span className="text-sm text-text-faint">{listings.length} live</span>
        </div>

        {!ready ? (
          <p className="px-5 py-14 text-center text-sm text-text-faint">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-text-faint">
            Nothing here yet. Paste a product link above to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {listings.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <ProductThumb
                    src={l.product.imageUrl}
                    size={48}
                    className="h-12 w-12 rounded-md"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {l.product.name}
                    </p>
                    <p className="text-xs text-text-faint">
                      {l.product.brand.name}
                      {l.product.pricePence !== null &&
                        ` · ${gbpFromPence(l.product.pricePence)}`}
                    </p>
                    {l.trackingLink && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <code className="rounded bg-surface-2 px-2 py-0.5 text-[0.7rem] text-text-muted">
                          /go/{l.trackingLink.code}
                        </code>
                        <span className="inline-flex items-center gap-1 text-[0.7rem] text-text-faint">
                          <MousePointerClick size={11} />
                          {compact(l.trackingLink.clickCount)} clicks
                        </span>
                        {l.trackingLink.discountCode && (
                          <span className="text-[0.7rem] text-text-faint">
                            code {l.trackingLink.discountCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {l.trackingLink?.isPlaceholder && (
                      <Badge tone="amber">Pending brand deal</Badge>
                    )}
                    {l.trackingLink && (
                      <button
                        onClick={() => copyLink(l.trackingLink!.code)}
                        title="Copy your tracking link"
                        className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
                      >
                        {copied === l.trackingLink.code ? (
                          <Check size={15} className="text-accent-green" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    )}
                    <a
                      href={`/@${handle}/${l.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View the product page"
                      className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => remove(l.id)}
                      aria-label="Remove"
                      className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
