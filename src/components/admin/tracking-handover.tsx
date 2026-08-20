"use client";

import { useState } from "react";
import { Check, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { shopifyPixelSnippet, SHOPIFY_STEPS } from "@/lib/pixel-snippet";

/**
 * What to hand the brand, once they exist.
 *
 * Two quite different answers depending on what their shop runs on, and the
 * difference matters enough to be the whole shape of this component. A Shopify
 * owner needs a block of text and seven instructions and can be reporting sales
 * before the call ends. Everybody else needs a key and a secret and a developer,
 * which is a slower conversation that starts with an email.
 *
 * The secret is shown once and never again, so this is the only moment it can
 * be copied. That is said plainly rather than left for someone to discover.
 */

function CopyBox({
  value,
  label,
  mono = true,
  secret = false,
}: {
  value: string;
  label: string;
  mono?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access is refused in some browsers and over plain http. The
      // text is on screen either way, so select it rather than failing loudly.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-strong">{label}</span>
        <Button type="button" size="sm" variant="secondary" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className={`max-h-80 overflow-auto rounded-sm border border-border bg-surface-2 p-3 text-xs text-text ${
          mono ? "font-mono" : ""
        } ${secret ? "select-all" : ""}`}
      >
        {value}
      </pre>
    </div>
  );
}

export function TrackingHandover({
  brandName,
  platform,
  trackingKey,
  secret,
}: {
  brandName: string;
  platform: "SHOPIFY" | "WOOCOMMERCE" | "OTHER";
  trackingKey: string;
  /** Present only in the moments after it was minted. */
  secret?: string;
}) {
  const origin = typeof window === "undefined" ? undefined : window.location.origin;

  if (platform === "SHOPIFY") {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Send this to {brandName}
          </h2>
          <Badge tone="green">Shopify</Badge>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          The store owner can do this themselves in about five minutes. It does
          not touch their theme or their checkout, and no developer is needed.
        </p>

        <ol className="mt-4 space-y-1.5 text-sm text-text-muted">
          {SHOPIFY_STEPS.map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="text-text-faint">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <CopyBox
          label="The snippet to paste"
          value={shopifyPixelSnippet(trackingKey, origin)}
        />

        <p className="mt-4 flex items-start gap-2 text-sm text-text-muted">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            A pixel runs in the shopper&apos;s browser, so an ad blocker can stop
            it and the reported value cannot be proved. Sales arriving this way
            are marked unverified and should be checked against the brand&apos;s
            own orders before commission is paid.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-semibold text-text-strong">
          Send this to {brandName}
        </h2>
        <Badge tone="neutral">
          {platform === "WOOCOMMERCE" ? "WooCommerce" : "Server postback"}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-text-muted">
        Their developer calls us when an order completes, signing the request
        with the secret. This is the version we can prove, so sales arriving this
        way are trusted.
      </p>

      <CopyBox label="Tracking key" value={trackingKey} />

      {secret ? (
        <>
          <CopyBox label="Signing secret" value={secret} secret />
          <p className="mt-3 flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              The secret is shown once. Copy it now and send it to the brand
              through something private. If it is lost, issue new credentials,
              which replaces both and stops the old pair working.
            </span>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-text-faint">
          The secret was shown when it was issued and cannot be shown again.
          Issue new credentials to replace both.
        </p>
      )}

      <p className="mt-4 text-sm text-text-muted">
        The full contract, with a worked example, is in the brand integration
        guide.
      </p>
    </div>
  );
}
