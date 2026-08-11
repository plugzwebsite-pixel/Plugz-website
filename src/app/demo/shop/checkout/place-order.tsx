"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The order button.
 *
 * Posts to the demo shop's own "server", which is what signs the message and
 * calls the public tracking endpoint — the same two things a real brand's
 * backend does when an order is confirmed.
 */
export function PlaceOrder({
  pz,
  valuePence,
}: {
  pz: string | null;
  valuePence: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function place() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/shop/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pz, valuePence }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message ?? "Could not place the order.");
        setBusy(false);
        return;
      }
      router.push(`/demo/shop/complete?order=${encodeURIComponent(json.data.orderRef)}`);
    } catch {
      setError("Could not reach the shop's server.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={place}
        disabled={busy}
        className="w-full bg-[#1c1917] py-4 text-sm font-medium tracking-wide text-[#faf8f5] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "PLACING ORDER…" : "PLACE ORDER"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!pz && (
        <p className="mt-3 text-sm text-[#7a6a45]">
          No Pluggz reference on this order — it will complete, but there is
          nothing to attribute it to.
        </p>
      )}
    </div>
  );
}
