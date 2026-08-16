"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Tag, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

/**
 * The brand's discount code for one creator's link, edited in place.
 *
 * A code belongs to a creator and a product together, so a screen of its own
 * would just be this table again. Editing the cell keeps it beside the product
 * and creator it applies to, which is the only way to tell two codes apart.
 */
export function DiscountCodeCell({
  listingId,
  code,
  product,
}: {
  listingId: string;
  code: string | null;
  product: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(code ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function save() {
    const next = value.trim();
    if (next === (code ?? "")) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/tracking-links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, discountCode: next }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't save that code", body?.message);
      return;
    }
    setEditing(false);
    toast.success(
      next ? "Code saved" : "Code removed",
      next ? `${product} now shows ${next}` : `${product} no longer shows a code`
    );
    router.refresh();
  }

  function cancel() {
    setValue(code ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-left transition-colors hover:bg-surface-2"
        aria-label={code ? `Change the discount code for ${product}` : `Add a discount code for ${product}`}
      >
        {code ? (
          <>
            <Tag size={13} className="shrink-0 text-brand-pink" />
            <span className="font-mono text-xs text-text-strong">{code}</span>
          </>
        ) : (
          <span className="text-xs text-text-faint group-hover:text-text-muted">
            Add code
          </span>
        )}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={value}
        maxLength={40}
        disabled={saving}
        placeholder="KATIE20"
        aria-label={`Discount code for ${product}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") cancel();
        }}
        className="h-8 w-28 rounded-sm border border-border bg-surface-2 px-2 font-mono text-xs uppercase text-text focus:border-brand-pink/70 focus:bg-surface"
      />
      <button
        onClick={save}
        disabled={saving}
        aria-label="Save the code"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-brand-pink"
      >
        <Check size={14} />
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        aria-label="Cancel"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text-strong"
      >
        <X size={14} />
      </button>
    </span>
  );
}
