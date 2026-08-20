"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The link a shopper actually follows, where somebody can copy it.
 *
 * It existed from the moment a creator plugged the product, and there was
 * nowhere in the admin to see it. To send a brand a link to test with, you had
 * to open the creator's storefront, open the product, and read it out of the
 * button, which is not a thing anybody would guess. It is now a column.
 *
 * The short code is what is shown rather than the whole address, because the
 * address is the same for every row and the code is the only part that differs.
 * Copying gives the full link, which is what gets pasted somewhere.
 */
export function TrackingLinkCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const href = `/go/${code}`;

  async function copy() {
    const full =
      typeof window === "undefined" ? href : `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      // Refused in some browsers and over plain http. The link is on screen
      // either way, so let it be selected by hand rather than failing loudly.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title="Open this link the way a shopper would"
        className="font-mono text-xs text-text-muted transition-colors hover:text-text-strong"
      >
        /go/{code}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy the full link"}
        title={copied ? "Copied" : "Copy the full link"}
        className="rounded p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
      >
        {copied ? <Check size={13} className="text-accent-green" /> : <Copy size={13} />}
      </button>
    </span>
  );
}
