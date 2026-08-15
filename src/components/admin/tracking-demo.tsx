"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/smart-image";
import { gbpFromPence } from "@/lib/utils";

type State = {
  creator: { handle: string; name: string; avatarUrl: string | null };
  product: {
    name: string;
    imageUrl: string | null;
    pricePence: number | null;
    brand: string;
    hasCredentials: boolean;
    commissionRate: number;
    returnWindowDays: number;
  };
  link: { code: string; clickCount: number; destinationUrl: string };
  path: string;
  sales: {
    id: string;
    orderRef: string | null;
    valuePence: number;
    creatorAmountPence: number;
    pluggzAmountPence: number;
    creatorRate: number;
    pluggzRate: number;
    status: string;
    stage: string;
    verifiesAt: string;
    clickId: string | null;
  }[];
};

type Step = {
  done: boolean;
  detail?: string;
};

/**
 * A walkthrough of a sale, run against the live system.
 *
 * Every step here is the real thing: a real tracking link, a real click, the
 * real public endpoint a brand posts to, and the real commission engine. The
 * one part that is simulated is the brand's own shop, because we don't have a
 * partner store to buy from, and that is called out on screen rather than
 * glossed over, since the whole point is to show a brand what their side has
 * to do.
 */
export function TrackingDemo() {
  const [state, setState] = useState<State | null>(null);
  const [pz, setPz] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [postback, setPostback] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/demo/state");
    const json = await res.json().catch(() => null);
    if (res.ok) setState(json.data);
    else setError(json?.message ?? "Couldn't load the demo.");
  }, []);

  // Load once on mount. The flag drops the result if the component has gone
  // by the time the request lands.
  useEffect(() => {
    let live = true;
    void (async () => {
      const res = await fetch("/api/demo/state");
      const json = await res.json().catch(() => null);
      if (!live) return;
      if (res.ok) setState(json.data);
      else setError(json?.message ?? "Couldn't load the demo.");
    })();
    return () => {
      live = false;
    };
  }, []);

  async function simulateClick() {
    if (!state) return;
    setBusy("click");
    setError(null);
    try {
      // Follow the real redirect and read the reference off the destination,
      // exactly as the brand's own page would see it in its URL.
      const res = await fetch(`/api/demo/click?code=${state.link.code}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Redirect failed");
      setPz(json.data.pz);
      setSteps((s) => ({
        ...s,
        click: { done: true, detail: json.data.destination },
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function simulateOrder() {
    if (!pz || !state) return;
    setBusy("order");
    setError(null);
    try {
      const res = await fetch("/api/demo/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pz, value: state.product.pricePence ?? 4600 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Postback failed");
      setPostback(json.data);
      setSteps((s) => ({ ...s, order: { done: true } }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    await fetch("/api/demo/state", { method: "DELETE" });
    setPz(null);
    setSteps({});
    setPostback(null);
    setError(null);
    await load();
    setBusy(null);
  }

  if (error && !state) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!state) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 size={15} className="animate-spin" /> Loading…
      </p>
    );
  }

  const latest = state.sales[0];

  return (
    <div className="space-y-5">
      {!state.product.hasCredentials && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-300">
          {`${state.product.brand} has no tracking credentials yet. Issue them from Admin → Brands and this walkthrough will run end to end.`}
        </p>
      )}

      {/* 1. The creator's listing */}
      <Panel n={1} title="A creator plugs a product" done>
        <div className="flex flex-wrap items-center gap-4">
          {state.product.imageUrl && (
            <SmartImage
              src={state.product.imageUrl}
              alt={state.product.name}
              width={72}
              height={72}
              className="h-18 w-18 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-strong">{state.product.name}</p>
            <p className="text-sm text-text-muted">
              {`${state.product.brand} · plugged by @${state.creator.handle}`}
            </p>
            <a
              href={state.path}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-brand-pink hover:underline"
            >
              View the live page <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <Field label="Their permanent Pluggz link">
          <code className="text-brand-pink">{`pluggzofficial.co.uk/go/${state.link.code}`}</code>
        </Field>
        <p className="text-xs text-text-faint">
          {`${state.link.clickCount} clicks recorded on this link so far.`}
        </p>
      </Panel>

      {/* 2. The click */}
      <Panel n={2} title="A shopper taps it" done={steps.click?.done}>
        <p className="text-sm text-text-muted">
          Pluggz records the click, then sends them to {state.product.brand} carrying a
          reference that is unique to this one tap.
        </p>
        {steps.click?.done ? (
          <>
            <Field label="Where they landed">
              <span className="break-all text-text">{steps.click.detail}</span>
            </Field>
            <Field label="The reference the brand now holds">
              <code className="text-accent-green">{pz}</code>
            </Field>
          </>
        ) : (
          <Button onClick={simulateClick} disabled={busy !== null} size="sm">
            {busy === "click" ? "Following the link…" : "Tap the link"}
            <ArrowRight size={15} />
          </Button>
        )}
      </Panel>

      {/* 3. The brand's side */}
      <Panel n={3} title="The shopper buys, on the brand's own site" done={steps.order?.done}>
        <p className="rounded-md border border-border bg-surface-2/60 p-3 text-sm text-text-muted">
          <strong className="text-text">This is the only simulated step.</strong> We have no
          partner store to buy from, so this stands in for {state.product.brand}&apos;s checkout.
          It does exactly what their server would do: takes the reference, signs the message with
          their secret, and posts it to our public endpoint.
        </p>
        {steps.order?.done && postback ? (
          <>
            <Field label="What their server sent">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-text">
                {JSON.stringify(postback.sent, null, 2)}
              </pre>
            </Field>
            <Field label="Signed with their secret">
              <code className="break-all text-text-muted">{String(postback.signature)}</code>
            </Field>
            <Field label="Our reply">
              <code className="text-accent-green">
                {`${postback.status} · ${JSON.stringify(postback.response)}`}
              </code>
            </Field>
          </>
        ) : (
          <Button onClick={simulateOrder} disabled={!pz || busy !== null} size="sm">
            {busy === "order" ? "Placing the order…" : "Complete the order"}
            <ArrowRight size={15} />
          </Button>
        )}
      </Panel>

      {/* 4. The result */}
      <Panel n={4} title="It appears on the dashboards" done={Boolean(latest)}>
        {latest ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Order value" value={gbpFromPence(latest.valuePence)} />
              <Stat
                label={`Creator earns (${latest.creatorRate}%)`}
                value={gbpFromPence(latest.creatorAmountPence)}
                tone="green"
              />
              <Stat
                label={`Pluggz earns (${latest.pluggzRate}%)`}
                value={gbpFromPence(latest.pluggzAmountPence)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="amber">{latest.status}</Badge>
              <span className="text-text-muted">
                {`clears on ${new Date(latest.verifiesAt).toLocaleDateString("en-GB")}, after ${state.product.brand}'s ${state.product.returnWindowDays}-day return window`}
              </span>
            </div>
            <p className="text-sm text-text-muted">
              {latest.clickId
                ? "Tied back to the exact click that earned it, so the right creator is paid."
                : "Recorded, but not tied to a click."}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Nothing recorded yet. Run the steps above.
          </p>
        )}
      </Panel>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={reset} disabled={busy !== null}>
          <RotateCcw size={15} />
          {busy === "reset" ? "Resetting…" : "Reset the walkthrough"}
        </Button>
        <span className="text-xs text-text-faint">
          Removes only the sales this demo created.
        </span>
      </div>
    </div>
  );
}

function Panel({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span
          className={
            done
              ? "grid h-6 w-6 place-items-center rounded-full bg-accent-green/15 text-accent-green"
              : "grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-text-muted"
          }
        >
          {done ? <Check size={14} /> : n}
        </span>
        <h2 className="font-medium text-text-strong">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-3">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">{label}</p>
      <div className="font-mono text-xs">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-3">
      <p className="text-xs text-text-faint">{label}</p>
      <p
        className={
          tone === "green"
            ? "mt-1 font-display text-2xl font-semibold text-accent-green"
            : "mt-1 font-display text-2xl font-semibold text-text-strong"
        }
      >
        {value}
      </p>
    </div>
  );
}
