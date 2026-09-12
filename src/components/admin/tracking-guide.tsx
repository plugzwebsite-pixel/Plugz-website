"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Server, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { SHOPIFY_STEPS } from "@/lib/pixel-snippet";

const postbackExample = `const rawBody = JSON.stringify({
  pz: storedClickReference,
  orderRef: order.id,
  value: 4499, // GBP 44.99, always in pence
  currency: "GBP"
});

const signature = crypto
  .createHmac("sha256", PLUGGZ_SIGNING_SECRET)
  .update(rawBody)
  .digest("hex");

await fetch("https://pluggzofficial.co.uk/api/track/sale", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Pluggz-Key": PLUGGZ_TRACKING_KEY,
    "X-Pluggz-Signature": signature
  },
  body: rawBody
});`;

export function TrackingGuide() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <BookOpen size={15} /> View implementation guide
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tracking-guide-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-md border border-border bg-surface shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <Badge tone="cyan">Brand handover</Badge>
                <h2 id="tracking-guide-title" className="mt-2 font-display text-2xl font-semibold text-text-strong">
                  Tracking implementation guide
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-text-muted">
                  Choose one pathway, send the brand only what it needs, then verify one complete click-to-sale journey.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text-strong"
                aria-label="Close tracking guide"
              >
                <X size={19} />
              </button>
            </header>

            <div className="space-y-8 px-5 py-6 sm:px-7">
              <section className="rounded-md border border-accent-gold/25 bg-accent-gold/5 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-accent-gold" size={18} />
                  <div className="text-sm text-text-muted">
                    <p className="font-semibold text-text-strong">Before replacing credentials</p>
                    <p className="mt-1">
                      Replacing a key immediately stops the previous key and secret. Confirm the brand is ready to update its live integration before clicking Replace. Signing secrets must stay server-side and must never be pasted into Shopify pixel or frontend code.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-brand-pink" size={20} />
                  <h3 className="font-display text-xl font-semibold text-text-strong">Pathway 1: Shopify custom pixel</h3>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  Use this when the shop owner has Shopify access but no developer. Issue the script, copy the complete snippet shown beneath that brand, and send it privately.
                </p>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SHOPIFY_STEPS.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-sm border border-border bg-surface-2 p-3 text-sm text-text-muted">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-pink/15 text-xs font-bold text-brand-pink">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm text-accent-gold">
                  Important: Save is not enough—the brand must click Connect. Pixel sales are marked unverified and should be reconciled before payout.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2">
                  <Server className="text-accent-cyan" size={20} />
                  <h3 className="font-display text-xl font-semibold text-text-strong">Pathway 2: signed server postback</h3>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  Recommended whenever the brand has a developer. Keep the <code className="text-text-strong">pz</code> value from the shopper&apos;s landing URL for 30 days, then report the confirmed order from the brand&apos;s server.
                </p>
                <pre className="mt-4 max-h-96 overflow-auto rounded-sm border border-border bg-surface-2 p-4 text-xs leading-relaxed text-text">
                  {postbackExample}
                </pre>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <GuideFact title="Required fields" text="pz, unique orderRef, and a positive whole-number value in pence. Currency defaults to GBP." />
                  <GuideFact title="Signature" text="HMAC-SHA256 of the exact raw JSON body, returned as lowercase hexadecimal." />
                  <GuideFact title="Safe retries" text="The same order reference for the same creator listing is recorded once, so retries cannot duplicate commission." />
                  <GuideFact title="Customer privacy" text="Do not send customer names, emails, addresses, card details or any other personal data." />
                </div>
              </section>

              <section>
                <h3 className="font-display text-xl font-semibold text-text-strong">Troubleshooting responses</h3>
                <div className="mt-3 overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[38rem] text-left text-sm">
                    <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-faint">
                      <tr><th className="px-4 py-3">Response</th><th className="px-4 py-3">Meaning</th><th className="px-4 py-3">What to check</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-muted">
                      <GuideRow code="200" meaning="Recorded or duplicate retry" action="Confirm the sale appears once in Admin → Sales." />
                      <GuideRow code="400" meaning="Invalid body or value" action="Use a JSON object and send value as positive integer pence." />
                      <GuideRow code="401" meaning="Key/signature rejected" action="Check the active key, exact raw body and signing secret. Do not re-stringify after signing." />
                      <GuideRow code="403" meaning="Brand/reference mismatch" action="The click must belong to a product owned by the same brand." />
                      <GuideRow code="422" meaning="Click reference not found" action="Make sure redirects, login and country selectors preserve and store pz." />
                      <GuideRow code="429" meaning="Too many requests" action="Retry with a short exponential backoff; do not create a new order reference." />
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-md border border-accent-green/25 bg-accent-green/5 p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-accent-green" size={19} />
                  <h3 className="font-semibold text-text-strong">Final sign-off checklist</h3>
                </div>
                <ol className="mt-3 space-y-2 text-sm text-text-muted">
                  <li>1. Open a real creator tracking link and confirm the brand receives both <code>ref=pluggz</code> and <code>pz</code>.</li>
                  <li>2. Complete one agreed low-value order and record its order reference.</li>
                  <li>3. Confirm one click and one sale appear against the correct creator and brand.</li>
                  <li>4. Confirm creator and Pluggz commission amounts match the configured rates.</li>
                  <li>5. Re-send the same order once and confirm it remains a single sale.</li>
                </ol>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GuideFact({ title, text }: { title: string; text: string }) {
  return <div className="rounded-sm border border-border bg-surface-2 p-4"><p className="font-medium text-text-strong">{title}</p><p className="mt-1 text-sm text-text-muted">{text}</p></div>;
}

function GuideRow({ code, meaning, action }: { code: string; meaning: string; action: string }) {
  return <tr><td className="px-4 py-3 font-mono font-semibold text-text-strong">{code}</td><td className="px-4 py-3">{meaning}</td><td className="px-4 py-3">{action}</td></tr>;
}
