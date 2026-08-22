"use client";

import { useState } from "react";
import { KeyRound, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { TrackingHandover } from "@/components/admin/tracking-handover";

/**
 * Issuing a brand its tracking credentials, at any time.
 *
 * They are minted when a brand is created, but that is a single moment on a
 * screen somebody has already left. A brand loses its secret, or a secret has
 * to be replaced because it was sent somewhere it should not have been, or a
 * brand added months ago is only now getting round to integrating. All three
 * are ordinary, and none of them should mean re-creating the brand.
 *
 * What comes back depends on the shop: a Shopify brand gets the snippet with
 * its key already inside, everyone else gets a key and a secret.
 */

export type CredentialBrand = {
  id: string;
  name: string;
  platform: "SHOPIFY" | "WOOCOMMERCE" | "OTHER";
  status: string;
  hasCredentials: boolean;
  products: number;
};

export function CredentialsManager({ brands }: { brands: CredentialBrand[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<
    { brandId: string; key: string; secret: string; rolled: boolean } | null
  >(null);
  const [known, setKnown] = useState<Record<string, boolean>>({});
  const toast = useToast();

  async function issue(brand: CredentialBrand) {
    const rolling = known[brand.id] ?? brand.hasCredentials;
    const warning = rolling
      ? `${brand.name} already has credentials.\n\nIssuing new ones stops the old pair working immediately, so anything already sending us sales will start being refused until they are updated. Continue?`
      : `Issue tracking credentials for ${brand.name}?\n\nThe secret is shown once and cannot be retrieved afterwards.`;
    if (!window.confirm(warning)) return;

    setBusy(brand.id);
    const res = await postJson<{ key: string; secret: string; rolled: boolean }>(
      `/api/admin/brands/${brand.id}/credentials`,
      {}
    );
    setBusy(null);

    if (!res.ok) {
      toast.error("Couldn't issue credentials", res.message);
      return;
    }
    setIssued({ brandId: brand.id, ...res.data! });
    setKnown((k) => ({ ...k, [brand.id]: true }));
    toast.success(
      res.data!.rolled ? "Credentials replaced" : "Credentials issued",
      "Copy the secret now. It is not shown again."
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? brands.filter((b) => b.name.toLowerCase().includes(needle))
    : brands;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a brand"
          aria-label="Find a brand"
          className="h-10 w-full rounded-sm border border-border bg-surface-2 pl-10 pr-4 text-sm text-text placeholder:text-text-faint focus:border-brand-pink/60 focus:bg-surface"
        />
      </div>

      {shown.length === 0 && (
        <p className="rounded-md border border-dashed border-border py-10 text-center text-sm text-text-faint">
          No brand matches &ldquo;{q}&rdquo;.
        </p>
      )}

      {shown.map((b) => {
        const has = known[b.id] ?? b.hasCredentials;
        return (
          <div key={b.id} className="rounded-md border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-text-strong">{b.name}</h3>
                  {b.platform === "SHOPIFY" && <Badge tone="neutral">Shopify</Badge>}
                  {b.platform === "WOOCOMMERCE" && <Badge tone="neutral">WooCommerce</Badge>}
                  {has ? (
                    <Badge tone="green">
                      <ShieldCheck size={11} /> Issued
                    </Badge>
                  ) : (
                    <Badge tone="amber">
                      <ShieldAlert size={11} /> Not issued
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-text-muted">
                  {b.products} product{b.products === 1 ? "" : "s"} ·{" "}
                  {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                  {has && " · the secret was shown when it was issued and cannot be shown again"}
                </p>
              </div>

              <Button
                size="sm"
                variant={has ? "secondary" : "primary"}
                loading={busy === b.id}
                onClick={() => issue(b)}
              >
                <KeyRound size={14} />
                {has ? "Replace" : b.platform === "SHOPIFY" ? "Issue script" : "Issue keys"}
              </Button>
            </div>

            {issued?.brandId === b.id && (
              <div className="mt-4">
                {issued.rolled && (
                  <p className="mb-3 text-sm text-amber-300">
                    The previous pair has stopped working. Anything still using it
                    will be refused until it is updated.
                  </p>
                )}
                <TrackingHandover
                  brandName={b.name}
                  platform={b.platform}
                  trackingKey={issued.key}
                  secret={issued.secret}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setIssued(null)}
                >
                  Done, I&apos;ve copied them
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
