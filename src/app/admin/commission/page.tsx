"use client";

import { useState } from "react";
import { Minus, Plus, Save, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

type Override = {
  id: number;
  name: string;
  type: "Creator" | "Brand";
  creator: number;
  pluggz: number;
};

const initialOverrides: Override[] = [
  { id: 1, name: "Sophie Clarke", type: "Creator", creator: 10, pluggz: 5 },
  { id: 2, name: "Aura Rituals", type: "Brand", creator: 8, pluggz: 7 },
  { id: 3, name: "Nadine Merabi", type: "Brand", creator: 9, pluggz: 6 },
];

export default function CommissionPage() {
  const [creator, setCreator] = useState(8);
  const [pluggz, setPluggz] = useState(5);
  const [overrides] = useState(initialOverrides);
  const toast = useToast();

  const total = creator + pluggz;

  function step(setter: (n: number) => void, value: number, dir: 1 | -1, min: number) {
    const next = Math.min(20, Math.max(min, value + dir));
    setter(next);
  }

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Set the platform-wide commission split, and override individual creators or
        brands for negotiated deals.
      </p>

      {/* Global default */}
      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Global default rate
          </h2>
          <Badge tone="brand">{total}% total</Badge>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <RateStepper
            label="Creator share"
            hint="Minimum 8%"
            value={creator}
            onDec={() => step(setCreator, creator, -1, 8)}
            onInc={() => step(setCreator, creator, 1, 8)}
          />
          <RateStepper
            label="Pluggz share"
            hint="Target 5%"
            value={pluggz}
            onDec={() => step(setPluggz, pluggz, -1, 3)}
            onInc={() => step(setPluggz, pluggz, 1, 3)}
          />
        </div>

        {/* Split bar */}
        <div className="mt-6">
          <div className="flex h-3 overflow-hidden rounded-pill">
            <div
              className="bg-grad-brand"
              style={{ width: `${(creator / total) * 100}%` }}
            />
            <div className="bg-accent-cyan" style={{ width: `${(pluggz / total) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-text-faint">
            <span>Creator {creator}%</span>
            <span>Pluggz {pluggz}%</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => toast.success("Default rate saved", `${creator}% creator · ${pluggz}% Pluggz`)}>
            <Save size={15} /> Save default
          </Button>
        </div>
      </div>

      {/* Overrides */}
      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Rate overrides
          </h2>
          <span className="text-sm text-text-faint">{overrides.length} active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Split</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-6 py-3.5 font-medium text-text-strong">{o.name}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={o.type === "Creator" ? "brand" : "cyan"}>{o.type}</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-text-muted">
                    {o.creator}% / {o.pluggz}%
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-text">{o.creator + o.pluggz}%</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => toast.info("Edit override", `Editing ${o.name}`)}
                      className="inline-grid h-8 w-8 place-items-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text-strong"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RateStepper({
  label,
  hint,
  value,
  onDec,
  onInc,
}: {
  label: string;
  hint: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface-2/50 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="text-xs text-text-faint">{hint}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onDec}
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-text-muted hover:text-text-strong"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} />
        </button>
        <span className="font-display text-3xl font-semibold text-text-strong">{value}%</span>
        <button
          onClick={onInc}
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-text-muted hover:text-text-strong"
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
