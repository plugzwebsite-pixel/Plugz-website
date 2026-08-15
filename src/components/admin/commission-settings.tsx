"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

export type Override = {
  id: string;
  name: string;
  type: "Creator" | "Brand";
  creatorRate: number;
  pluggzRate: number;
  note: string | null;
};

const CREATOR_FLOOR = 8;
const PLUGGZ_FLOOR = 3;
const TOTAL_MIN = 11;
const TOTAL_MAX = 15;

export function CommissionSettings({
  defaultCreatorRate,
  defaultPluggzRate,
  overrides,
}: {
  defaultCreatorRate: number;
  defaultPluggzRate: number;
  overrides: Override[];
}) {
  const [creator, setCreator] = useState(defaultCreatorRate);
  const [pluggz, setPluggz] = useState(defaultPluggzRate);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const total = creator + pluggz;
  const outOfBand = total < TOTAL_MIN || total > TOTAL_MAX;
  const dirty = creator !== defaultCreatorRate || pluggz !== defaultPluggzRate;

  function step(
    setter: (n: number) => void,
    value: number,
    dir: 1 | -1,
    min: number
  ) {
    setter(Math.min(20, Math.max(min, value + dir)));
  }

  async function save() {
    setSaving(true);
    const res = await postJson("/api/admin/commission", {
      scope: "global",
      creatorRate: creator,
      pluggzRate: pluggz,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't save", res.message);
      return;
    }
    toast.success(
      "Default rate saved",
      `${creator}% creator · ${pluggz}% Pluggz · applies to new sales`
    );
    router.refresh();
  }

  async function removeOverride(id: string, name: string) {
    const res = await fetch(`/api/admin/commission?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't remove that override");
      return;
    }
    toast.success("Override removed", `${name} is back on the default rate`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-text-muted">
        Set the platform-wide commission split, and override individual creators
        or brands for negotiated deals.
      </p>

      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Global default rate
          </h2>
          <Badge tone={outOfBand ? "amber" : "brand"}>{total}% total</Badge>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <RateStepper
            label="Creator share"
            hint={`Minimum ${CREATOR_FLOOR}%`}
            value={creator}
            onDec={() => step(setCreator, creator, -1, CREATOR_FLOOR)}
            onInc={() => step(setCreator, creator, 1, CREATOR_FLOOR)}
          />
          <RateStepper
            label="Pluggz share"
            hint="Target 5%"
            value={pluggz}
            onDec={() => step(setPluggz, pluggz, -1, PLUGGZ_FLOOR)}
            onInc={() => step(setPluggz, pluggz, 1, PLUGGZ_FLOOR)}
          />
        </div>

        <div className="mt-6">
          <div className="flex h-3 overflow-hidden rounded-pill">
            <div className="bg-grad-brand" style={{ width: `${(creator / total) * 100}%` }} />
            <div className="bg-accent-cyan" style={{ width: `${(pluggz / total) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-text-faint">
            <span>Creator {creator}%</span>
            <span>Pluggz {pluggz}%</span>
          </div>
        </div>

        {outOfBand && (
          <p className="mt-4 rounded-sm border border-accent-gold/30 bg-accent-gold/[0.06] p-3 text-sm text-text-muted">
            {`Total take is normally between ${TOTAL_MIN}% and ${TOTAL_MAX}%. Saving outside that band will be rejected.`}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <p className="mr-auto text-xs text-text-faint">
            Rates are recorded on each sale when it happens, so changing this
            never alters commission already earned.
          </p>
          <Button onClick={save} loading={saving} disabled={!dirty || outOfBand}>
            <Save size={15} /> Save default
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Rate overrides
          </h2>
          <span className="text-sm text-text-faint">{overrides.length} active</span>
        </div>

        {overrides.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-muted">
            No overrides. Every creator and brand is on the default split.
          </p>
        ) : (
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
                    <td className="px-6 py-3.5 font-medium text-text-strong">
                      {o.name}
                      {o.note && (
                        <span className="ml-2 text-xs font-normal text-text-faint">
                          {o.note}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone={o.type === "Creator" ? "brand" : "cyan"}>
                        {o.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-text-muted">
                      {o.creatorRate}% / {o.pluggzRate}%
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-text">
                      {o.creatorRate + o.pluggzRate}%
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => removeOverride(o.id, o.name)}
                        aria-label={`Remove override for ${o.name}`}
                        className="inline-grid h-8 w-8 place-items-center rounded-full text-text-faint transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <span className="font-display text-3xl font-semibold text-text-strong">
          {value}%
        </span>
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
