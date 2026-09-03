"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Minus, Plus, Save, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Select } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";
import {
  CREATOR_FLOOR,
  PLUGGZ_FLOOR,
  TOTAL_MIN,
  TOTAL_MAX,
  RATE_CEILING,
} from "@/lib/commission-limits";

export type Override = {
  id: string;
  name: string;
  type: "Creator" | "Brand";
  creatorRate: number;
  pluggzRate: number;
  note: string | null;
};

export type Party = { id: string; name: string; returnWindowDays?: number };

export type SeasonalWindow = {
  id: string;
  brand: string;
  label: string;
  days: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  past: boolean;
};


export function CommissionSettings({
  defaultCreatorRate,
  defaultPluggzRate,
  overrides,
  creators,
  brands,
  seasonal,
}: {
  defaultCreatorRate: number;
  defaultPluggzRate: number;
  overrides: Override[];
  creators: Party[];
  brands: Party[];
  seasonal: SeasonalWindow[];
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
          <div className="flex items-center gap-2.5">
            <UserCog size={18} className="text-text-faint" />
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Rate overrides
            </h2>
          </div>
          <span className="text-sm text-text-faint">{overrides.length} active</span>
        </div>

        <AddOverride
          creators={creators}
          brands={brands}
          defaultCreatorRate={defaultCreatorRate}
          defaultPluggzRate={defaultPluggzRate}
        />

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

      <SeasonalWindows brands={brands} seasonal={seasonal} />
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

/**
 * Put one creator or one brand on their own split.
 *
 * The API has always accepted these; there was no way to enter one, so an
 * override could only be added by someone with database access. Only one of
 * the two ids is ever sent, which is what the endpoint requires.
 */
function AddOverride({
  creators,
  brands,
  defaultCreatorRate,
  defaultPluggzRate,
}: {
  creators: Party[];
  brands: Party[];
  defaultCreatorRate: number;
  defaultPluggzRate: number;
}) {
  const [type, setType] = useState<"Creator" | "Brand">("Creator");
  const [subject, setSubject] = useState("");
  const [creatorRate, setCreatorRate] = useState(defaultCreatorRate);
  const [pluggzRate, setPluggzRate] = useState(defaultPluggzRate);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const list = type === "Creator" ? creators : brands;
  const total = creatorRate + pluggzRate;
  const outOfBand = total < TOTAL_MIN || total > TOTAL_MAX;

  async function add() {
    if (!subject) {
      toast.error("Pick who it is for");
      return;
    }
    setSaving(true);
    const res = await postJson("/api/admin/commission", {
      scope: "override",
      ...(type === "Creator" ? { creatorProfileId: subject } : { brandId: subject }),
      creatorRate,
      pluggzRate,
      note: note.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't add that", res.message);
      return;
    }
    const name = list.find((p) => p.id === subject)?.name ?? "They";
    // Saved either way, but if this pays out more than a brand is charged, the
    // difference comes out of Pluggz on every sale through them. Said out loud
    // here rather than left to be noticed in an invoice weeks later.
    const warning = (res.data as { warning?: string | null } | undefined)?.warning;
    if (warning) {
      toast.error("Override added, but check this", warning);
    } else {
      toast.success("Override added", `${name} is on ${creatorRate}% / ${pluggzRate}%`);
    }
    setSubject("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="border-b border-border px-6 py-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_1fr_6rem_6rem]">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="ov-type">
            Applies to
          </label>
          <Select
            id="ov-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as "Creator" | "Brand");
              setSubject("");
            }}
            className="h-11"
          >
            <option value="Creator">A creator</option>
            <option value="Brand">A brand</option>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="ov-who">
            {type === "Creator" ? "Creator" : "Brand"}
          </label>
          <Select
            id="ov-who"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11"
          >
            <option value="">Choose one</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="ov-creator">
            Creator %
          </label>
          <Input
            id="ov-creator"
            type="number"
            min={CREATOR_FLOOR}
            max={RATE_CEILING}
            value={creatorRate}
            onChange={(e) => setCreatorRate(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="ov-pluggz">
            Pluggz %
          </label>
          <Input
            id="ov-pluggz"
            type="number"
            min={PLUGGZ_FLOOR}
            max={RATE_CEILING}
            value={pluggzRate}
            onChange={(e) => setPluggzRate(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="ov-note">
            Why, so the next person knows
          </label>
          <Input
            id="ov-note"
            value={note}
            maxLength={200}
            placeholder="Launch deal agreed with Rachel"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button onClick={add} loading={saving} disabled={!subject || outOfBand}>
          <Plus size={15} /> Add override
        </Button>
      </div>

      {outOfBand && (
        <p className="mt-3 text-sm text-accent-gold">
          {`That totals ${total}%. The agreed band is ${TOTAL_MIN}% to ${TOTAL_MAX}%.`}
        </p>
      )}
    </div>
  );
}

/**
 * Christmas and the like: a longer return window for a fixed run of dates.
 *
 * The engine already read these when working out when a sale clears. This is
 * the way in. A window can only lengthen the brand's normal one, so the worst
 * a mistake here can do is hold a payout back rather than release it early.
 */
function SeasonalWindows({
  brands,
  seasonal,
}: {
  brands: Party[];
  seasonal: SeasonalWindow[];
}) {
  const [brandId, setBrandId] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(45);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const brand = brands.find((b) => b.id === brandId);
  // Only brands carry a window; the shared Party type is also used for
  // creators, who do not.
  const brandWindow = brand?.returnWindowDays ?? 0;
  const pointless = Boolean(brand) && days <= brandWindow;
  const ready = brandId && label.trim() && startsAt && endsAt;

  async function add() {
    setSaving(true);
    const res = await postJson("/api/admin/return-windows", {
      brandId,
      label: label.trim(),
      days,
      startsAt,
      endsAt,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't add that", res.message);
      return;
    }
    toast.success("Window added", `${brand?.name}: ${days} days for ${label.trim()}`);
    setLabel("");
    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  async function remove(id: string, what: string) {
    const res = await fetch(`/api/admin/return-windows?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Couldn't remove that");
      return;
    }
    toast.success("Window removed", `${what} is back on the brand's normal terms`);
    router.refresh();
  }

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Seasonal return windows
          </h2>
          <p className="mt-0.5 text-sm text-text-faint">
            A longer window over a set run of dates, for a brand that extends
            returns at Christmas or in a sale.
          </p>
        </div>
        <CalendarClock size={18} className="shrink-0 text-text-faint" />
      </div>

      <div className="border-b border-border px-6 py-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_6rem_10rem_10rem]">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="rw-brand">
              Brand
            </label>
            <Select
              id="rw-brand"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="h-11"
            >
              <option value="">Choose a brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.returnWindowDays} days)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="rw-label">
              What to call it
            </label>
            <Input
              id="rw-label"
              value={label}
              maxLength={60}
              placeholder="Christmas 2026"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="rw-days">
              Days
            </label>
            <Input
              id="rw-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="rw-from">
              From
            </label>
            <Input
              id="rw-from"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="rw-to">
              To
            </label>
            <Input
              id="rw-to"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
          {pointless && (
            <p className="mr-auto text-sm text-accent-gold">
              {`${brand?.name} already allows ${brandWindow} days, so this would change nothing.`}
            </p>
          )}
          <Button onClick={add} loading={saving} disabled={!ready || pointless}>
            <Plus size={15} /> Add window
          </Button>
        </div>
      </div>

      {seasonal.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-text-muted">
          None set. Every brand is on its own standard return window.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-6 py-3 font-medium">Brand</th>
                <th className="px-6 py-3 font-medium">Occasion</th>
                <th className="px-6 py-3 font-medium">Window</th>
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-6 py-3 font-medium">State</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {seasonal.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-6 py-3.5 font-medium text-text-strong">{w.brand}</td>
                  <td className="px-6 py-3.5 text-text-muted">{w.label}</td>
                  <td className="px-6 py-3.5 tabular-nums text-text">{w.days} days</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-text-muted">
                    {shortDate(w.startsAt)} to {shortDate(w.endsAt)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={w.active ? "green" : w.past ? "neutral" : "cyan"}>
                      {w.active ? "In force" : w.past ? "Finished" : "Upcoming"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => remove(w.id, `${w.brand} ${w.label}`)}
                      aria-label={`Remove the ${w.label} window for ${w.brand}`}
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
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function shortDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
