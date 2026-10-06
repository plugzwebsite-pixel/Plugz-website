"use client";

import { useState } from "react";
import { AlertCircle, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";import { Button } from "@/components/ui/button";

type ResolveResult = {
  ref: string;
  destinationUrl: string;
  brandName: string;
  creatorName: string;
  creatorHandle: string;
  productName: string;
  discountCode: string | null;
};

/**
 * A full URL, a /go/ path, or just the code all resolve the same way, so a
 * link can be copied straight out of a creator's post without trimming it.
 */
function toRef(raw: string): string {
  const v = raw.trim();
  const m = v.match(/\/go\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/);
  return m ? m[1] : v;
}

/**
 * Check a tracking link before it goes anywhere.
 *
 * The route behind this only reads. It never increments the click count and
 * never records a click or a sale, so testing a link here cannot pollute the
 * figures or create anything in the ledger.
 */
export function TestTrackingLink() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    const ref = toRef(input);
    setError(null);
    setResult(null);
    if (!ref) {
      setError(
        "Enter a tracking reference, for example the code from a /go/ link."
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/tracking-links/resolve?ref=${encodeURIComponent(ref)}`
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message ?? "Couldn't check that link.");
        return;
      }
      setResult(json.data as ResolveResult);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface-2">
          <FlaskConical size={18} className="text-text-muted" />
        </div>
        <div>
          <h2 className="font-medium text-text-strong">Test a tracking link</h2>
          <p className="mt-1 text-sm text-text-muted">
            See exactly where a link takes a shopper, and who it credits,
            before it goes live. This only reads: no click is recorded and no
            sale is created.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="t-ref" className="sr-only">
            Tracking reference
          </label>
          <Input
            id="t-ref"
            placeholder="/go/abc123 or just the code"
            className="font-mono"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                test();
              }
            }}
          />
        </div>
        <Button type="button" onClick={test} loading={busy}>
          {busy ? "Checking…" : "Test link"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={15} /> {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-md border border-accent-green/25 bg-accent-green/[0.06] p-4">
          <p className="text-sm text-text">
            A shopper clicking{" "}
            <code className="font-mono text-text-strong">/go/{result.ref}</code>{" "}
            would land on{" "}
            <a
              href={result.destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all font-medium text-text-strong underline decoration-text-faint underline-offset-2 hover:decoration-text-strong"
            >
              {result.destinationUrl}
            </a>{" "}
            via {result.brandName}.
          </p>
          <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-faint">Creator</dt>
              <dd className="text-text-strong">
                {result.creatorName}{" "}
                <span className="text-text-muted">
                  @{result.creatorHandle}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-text-faint">Product</dt>
              <dd className="text-text-strong">{result.productName}</dd>
            </div>
            {result.discountCode && (
              <div>
                <dt className="text-text-faint">Discount code</dt>
                <dd className="font-mono text-text-strong">
                  {result.discountCode}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-text-faint">
            This was a lookup only. The click count was not touched.
          </p>
        </div>
      )}
    </div>
  );
}
