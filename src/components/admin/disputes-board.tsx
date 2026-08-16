"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Select } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

export type DisputeRow = {
  id: string;
  reason: string;
  status: string;
  detail: string;
  raisedBy: string;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
  sale: {
    id: string;
    orderRef: string | null;
    valuePence: number;
    brand: string;
    product: string;
    handle: string;
  };
};

export type SaleOption = {
  id: string;
  label: string;
};

export const REASON_LABELS: Record<string, string> = {
  RETURNED_NOT_REPORTED: "Returned, never reported",
  VALUE_WRONG: "Amount does not match",
  NOT_OUR_SALE: "Brand says not ours",
  DUPLICATE: "Reported twice",
  CREATOR_QUERY: "Creator has queried it",
  OTHER: "Something else",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  WITH_BRAND: "With the brand",
  RESOLVED: "Resolved",
  WRITTEN_OFF: "Written off",
};

const STATUS_TONE: Record<string, "amber" | "cyan" | "green" | "neutral"> = {
  OPEN: "amber",
  WITH_BRAND: "cyan",
  RESOLVED: "green",
  WRITTEN_OFF: "neutral",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    pence / 100
  );

export function DisputesBoard({
  disputes,
  sales,
}: {
  disputes: DisputeRow[];
  sales: SaleOption[];
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-text-muted">
        Where a brand or a creator says a recorded sale is wrong. Nothing here
        moves money: it is the record of the disagreement, who is waiting on
        whom, and what was agreed. Correcting the sale itself stays a separate,
        deliberate step.
      </p>

      <RaiseDispute sales={sales} />

      <div className="rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ScrollText size={18} className="text-text-faint" />
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Disputes
            </h2>
          </div>
          <span className="text-sm text-text-faint">
            {disputes.filter((d) => d.status === "OPEN" || d.status === "WITH_BRAND").length}{" "}
            still open
          </span>
        </div>

        {disputes.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-text-muted">
            Nothing disputed. Sales are being accepted as reported.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {disputes.map((d) => (
              <DisputeItem key={d.id} dispute={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RaiseDispute({ sales }: { sales: SaleOption[] }) {
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("VALUE_WRONG");
  const [raisedBy, setRaisedBy] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const ready = saleId && raisedBy.trim() && detail.trim().length > 3;

  async function raise() {
    setSaving(true);
    const res = await postJson("/api/admin/disputes", {
      saleId,
      reason,
      raisedBy: raisedBy.trim(),
      detail: detail.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't raise that", res.message);
      return;
    }
    toast.success("Dispute raised", "It is on the board and counted as open");
    setSaleId("");
    setDetail("");
    router.refresh();
  }

  if (sales.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-6 py-10 text-center text-sm text-text-muted">
        No sales recorded yet, so there is nothing to dispute.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-text-strong">
        Raise a dispute
      </h2>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="d-sale">
            Which sale
          </label>
          <Select id="d-sale" value={saleId} onChange={(e) => setSaleId(e.target.value)} className="h-11">
            <option value="">Choose a sale</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="d-reason">
            What is wrong
          </label>
          <Select id="d-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11">
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[16rem_1fr]">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="d-by">
            Who told us
          </label>
          <Input
            id="d-by"
            value={raisedBy}
            maxLength={80}
            placeholder="Rachel, or the brand contact"
            onChange={(e) => setRaisedBy(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted" htmlFor="d-detail">
            What they said
          </label>
          <Input
            id="d-detail"
            value={detail}
            maxLength={1000}
            placeholder="Order was refunded on the 12th, we were never sent a return"
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={raise} loading={saving} disabled={!ready}>
          <Plus size={15} /> Raise dispute
        </Button>
      </div>
    </div>
  );
}

function DisputeItem({ dispute: d }: { dispute: DisputeRow }) {
  const [status, setStatus] = useState(d.status);
  const [resolution, setResolution] = useState(d.resolution ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const closing = status === "RESOLVED" || status === "WRITTEN_OFF";
  const dirty = status !== d.status || resolution !== (d.resolution ?? "");

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, status, resolution }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't save that", body?.message);
      return;
    }
    toast.success("Dispute updated", STATUS_LABELS[status]);
    router.refresh();
  }

  return (
    <li className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>
              {STATUS_LABELS[d.status] ?? d.status}
            </Badge>
            <span className="text-sm font-semibold text-text-strong">
              {REASON_LABELS[d.reason] ?? d.reason}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted">{d.detail}</p>
          <p className="mt-2 text-xs text-text-faint">
            {d.sale.brand} · {d.sale.product} · @{d.sale.handle} ·{" "}
            {gbp(d.sale.valuePence)}
            {d.sale.orderRef ? ` · order ${d.sale.orderRef}` : ""}
          </p>
          <p className="mt-1 text-xs text-text-faint">
            Raised by {d.raisedBy} on {dateFormat.format(new Date(d.openedAt))}
            {d.resolvedAt
              ? ` · closed ${dateFormat.format(new Date(d.resolvedAt))}`
              : ""}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-72">
          <Select
            value={status}
            aria-label="Dispute status"
            onChange={(e) => setStatus(e.target.value)}
            className="h-10"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>

          {closing && (
            <Input
              value={resolution}
              maxLength={1000}
              placeholder="What was agreed"
              aria-label="What was agreed"
              onChange={(e) => setResolution(e.target.value)}
            />
          )}

          {dirty && (
            <Button
              onClick={save}
              loading={saving}
              size="sm"
              disabled={closing && !resolution.trim()}
            >
              Save
            </Button>
          )}
        </div>
      </div>

      {!closing && d.resolution && (
        <p className="mt-3 rounded-sm border border-border bg-surface-2/50 p-3 text-sm text-text-muted">
          Previously: {d.resolution}
        </p>
      )}
    </li>
  );
}
