"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Plus, Bell, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { gbp } from "@/lib/utils";

type Link = {
  id: number;
  name: string;
  brand: string;
  price: number;
  clicks: number;
  live: boolean;
};

const initial: Link[] = [
  { id: 1, name: "Linen-blend holiday co-ord", brand: "Verano", price: 68, clicks: 2400, live: true },
  { id: 2, name: "Wide-leg denim", brand: "Shein", price: 29, clicks: 3200, live: true },
  { id: 3, name: "Oversized tailored blazer", brand: "North Row", price: 95, clicks: 1400, live: true },
];

// Central link database — brands whose links became newly available to plug.
const available = [
  { id: 101, name: "Peptide glow moisturiser", brand: "Aura Rituals", price: 42 },
  { id: 102, name: "Everyday gold hoops", brand: "Aurate", price: 120 },
];

let seq = 1000;
const sampleNames = ["Satin slip midi dress", "Ribbed knit lounge set", "Cabin carry-on case"];
const sampleBrands = ["Halcyon London", "Marlowe & Co", "Vomo"];

export function StorefrontManager() {
  const [links, setLinks] = useState<Link[]>(initial);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState(available);
  const toast = useToast();

  async function addByUrl() {
    if (!/^https?:\/\/.+\..+/.test(url.trim())) {
      toast.error("Enter a valid product URL");
      return;
    }
    setLoading(true);
    // Simulate Plugz fetching product metadata from the pasted URL.
    await new Promise((r) => setTimeout(r, 1100));
    const i = links.length % sampleNames.length;
    setLinks((prev) => [
      {
        id: ++seq,
        name: sampleNames[i],
        brand: sampleBrands[i],
        price: 40 + Math.floor(Math.random() * 80),
        clicks: 0,
        live: true,
      },
      ...prev,
    ]);
    setUrl("");
    setLoading(false);
    toast.success("Product added", "Page built and tracking generated.");
  }

  function claim(id: number) {
    const item = alerts.find((a) => a.id === id);
    if (!item) return;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setLinks((prev) => [{ ...item, clicks: 0, live: true }, ...prev]);
    toast.success("Added to your storefront");
  }

  return (
    <div className="space-y-6">
      {/* Paste a URL */}
      <div className="rounded-md border border-border bg-surface p-5">
        <label className="text-sm font-medium text-text">Add a product by URL</label>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://brand.com/products/linen-co-ord"
            leftIcon={<Link2 size={16} />}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
          />
          <Button onClick={addByUrl} loading={loading} className="shrink-0">
            <Plus size={16} /> Add product
          </Button>
        </div>
      </div>

      {/* New link alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md border border-brand-pink/25 bg-brand-pink/[0.05] p-5"
          >
            <div className="flex items-center gap-2 text-text-strong">
              <Bell size={16} className="text-brand-pink" />
              <h3 className="font-semibold">Newly available links</h3>
              <Badge tone="brand">{alerts.length}</Badge>
            </div>
            <div className="mt-4 space-y-2.5">
              {alerts.map((a) => (
                <motion.div
                  key={a.id}
                  layout
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between gap-4 rounded-sm border border-border bg-surface p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {a.name}
                    </p>
                    <p className="text-xs text-text-faint">
                      {a.brand} · {gbp(a.price)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => claim(a.id)}>
                    <Sparkles size={14} /> Add
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live links */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-text-strong">
            Your storefront links
          </h3>
          <span className="text-sm text-text-faint">{links.length} live</span>
        </div>
        <div className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {links.map((l) => (
              <motion.div
                key={l.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-2 text-text-muted">
                  <Link2 size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-strong">
                    {l.name}
                  </p>
                  <p className="text-xs text-text-faint">
                    {l.brand} · {gbp(l.price)} · {l.clicks.toLocaleString()} clicks
                  </p>
                </div>
                <Badge tone="green">Live</Badge>
                <button
                  onClick={() => setLinks((p) => p.filter((x) => x.id !== l.id))}
                  className="grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
