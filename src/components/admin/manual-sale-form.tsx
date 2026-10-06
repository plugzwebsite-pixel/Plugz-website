"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, PoundSterling } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";
import { cn, gbpFromPence } from "@/lib/utils";
import { manualSaleSchema } from "@/lib/validation";

export type ManualSaleBrand = {
  id: string;
  name: string;
  listings: { id: string; label: string }[];
};

type Mode = "click" | "code" | "listing";

type FormValues = {
  brandId: string;
  mode: Mode;
  clickRef: string;
  discountCode: string;
  listingId: string;
  valuePounds: string;
  orderRef: string;
  soldAt: string;
};

const formSchema = z.object({
  brandId: z.string().min(1, "Choose a brand"),
  mode: z.enum(["click", "code", "listing"]),
  clickRef: z.string().trim(),
  discountCode: z.string().trim().max(40),
  listingId: z.string(),
  valuePounds: z.string().trim().min(1, "Enter the order value"),
  orderRef: z
    .string()
    .trim()
    .max(80, "Keep the reference under 80 characters"),
  soldAt: z.string().trim().min(1, "Choose a date"),
});

type RecordedSummary = {
  id: string;
  valuePence: number;
  creatorAmountPence: number;
  pluggzAmountPence: number;
  verifiesAt: string;
  brandName: string;
  productName: string;
  creatorHandle: string;
  creatorName: string;
  orderRef: string | null;
};

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "click",
    label: "Click reference",
    hint: "The pz value the brand passed back",
  },
  {
    value: "code",
    label: "Discount code",
    hint: "The creator's code, as typed at checkout",
  },
  {
    value: "listing",
    label: "Creator listing",
    hint: "Choose the creator and product directly",
  },
];

/** "48.50", "£48.50" and "1,499.99" in pence. Anything else is a typo. */
function poundsToPence(raw: string): number | null {
  const cleaned = raw.replace(/[£\s]/g, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const pence = Math.round(Number(cleaned) * 100);
  return pence > 0 ? pence : null;
}

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Recording a sale without a brand report.
 *
 * The CSV import is for a brand's spreadsheet; this is for the one sale that
 * never appears in one. It records straight away, with no preview step, so
 * the attribution is checked twice: once here in the form, once in the route,
 * which refuses anything filed against the wrong brand.
 */
export function ManualSaleForm({ brands }: { brands: ManualSaleBrand[] }) {
  const [recorded, setRecorded] = useState<RecordedSummary | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandId: "",
      mode: "click",
      clickRef: "",
      discountCode: "",
      listingId: "",
      valuePounds: "",
      orderRef: "",
      soldAt: todayLocal(),
    },
  });

  const brandId = watch("brandId");
  const mode = watch("mode");

  // A listing belongs to one brand, so it cannot survive a brand change.
  useEffect(() => {
    setValue("listingId", "");
    clearErrors("listingId");
  }, [brandId, setValue, clearErrors]);

  const listings = brands.find((b) => b.id === brandId)?.listings ?? [];

  async function onSubmit(values: FormValues) {
    if (values.mode === "click" && values.clickRef.trim().length < 4) {
      setError("clickRef", { message: "Enter the click reference" });
      return;
    }
    if (values.mode === "code" && !values.discountCode.trim()) {
      setError("discountCode", { message: "Enter the discount code" });
      return;
    }
    if (values.mode === "listing" && !values.listingId) {
      setError("listingId", { message: "Choose a listing" });
      return;
    }
    const pence = poundsToPence(values.valuePounds);
    if (pence === null) {
      setError("valuePounds", {
        message: "Enter a valid amount, for example 48.50",
      });
      return;
    }

    const payload: z.input<typeof manualSaleSchema> = {
      brandId: values.brandId,
      attribution:
        values.mode === "click"
          ? { type: "click", clickRef: values.clickRef.trim() }
          : values.mode === "code"
            ? { type: "code", discountCode: values.discountCode.trim() }
            : { type: "listing", listingId: values.listingId },
      valuePence: pence,
      orderRef: values.orderRef.trim(),
      soldAt: values.soldAt,
    };

    const res = await postJson<RecordedSummary>(
      "/api/admin/sales/manual",
      payload
    );
    if (!res.ok) {
      if (res.errors) {
        const fieldMap: Partial<Record<string, keyof FormValues>> = {
          brandId: "brandId",
          valuePence: "valuePounds",
          orderRef: "orderRef",
          soldAt: "soldAt",
          "attribution.clickRef": "clickRef",
          "attribution.discountCode": "discountCode",
          "attribution.listingId": "listingId",
        };
        let shown = false;
        for (const [f, m] of Object.entries(res.errors)) {
          const mapped = fieldMap[f];
          if (mapped) setError(mapped, { message: m });
          else if (!shown) {
            setError("root", { message: m });
            shown = true;
          }
        }
      } else {
        setError("root", { message: res.message ?? "Something went wrong." });
      }
      return;
    }
    if (res.data) setRecorded(res.data);
  }

  if (recorded) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-accent-green"
          />
          <div className="w-full">
            <h2 className="font-medium text-text-strong">Sale recorded</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-faint">Order value</dt>
                <dd className="text-text-strong">
                  {gbpFromPence(recorded.valuePence)}
                  {recorded.orderRef && (
                    <span className="ml-2 font-mono text-xs text-text-muted">
                      {recorded.orderRef}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Credited to</dt>
                <dd className="text-text-strong">
                  @{recorded.creatorHandle}
                  <span className="ml-2 text-text-muted">
                    {recorded.productName}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Brand</dt>
                <dd className="text-text-strong">{recorded.brandName}</dd>
              </div>
              <div>
                <dt className="text-text-faint">Commission</dt>
                <dd className="text-text-muted">
                  {`${gbpFromPence(recorded.creatorAmountPence)} to the creator, ${gbpFromPence(recorded.pluggzAmountPence)} to Pluggz`}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-text-muted">
              It is in the payout pipeline now, pending the brand&apos;s return
              window.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRecorded(null);
                reset();
              }}
            >
              Record another sale
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-lg border border-border bg-surface p-6"
      noValidate
    >
      <div>
        <h2 className="font-medium text-text-strong">Record a single sale</h2>
        <p className="mt-1 text-sm text-text-muted">
          For the one sale that never appears in a brand report. This records
          straight away, with no preview step, so check the attribution before
          submitting.
        </p>
      </div>

      {errors.root && (
        <div className="flex items-start gap-2.5 rounded-sm border border-red-500/30 bg-red-500/[0.06] p-3.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.root.message}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Brand"
          htmlFor="s-brand"
          required
          error={errors.brandId?.message}
        >
          <Select id="s-brand" defaultValue="" {...register("brandId")}>
            <option value="" disabled>
              Choose a brand
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Order value"
          htmlFor="s-value"
          required
          error={errors.valuePounds?.message}
        >
          <Input
            id="s-value"
            inputMode="decimal"
            placeholder="48.50"
            leftIcon={<PoundSterling size={16} />}
            {...register("valuePounds")}
          />
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-text">
          Who earned it <span className="text-red-400">*</span>
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setValue("mode", m.value)}
              aria-pressed={mode === m.value}
              className={cn(
                "rounded-md border px-4 py-3 text-left transition-colors",
                mode === m.value
                  ? "border-brand-pink/60 bg-brand-pink/[0.08]"
                  : "border-border hover:border-text-faint"
              )}
            >
              <span
                className={cn(
                  "block text-sm font-medium",
                  mode === m.value ? "text-text-strong" : "text-text-muted"
                )}
              >
                {m.label}
              </span>
              <span className="mt-0.5 block text-xs text-text-faint">
                {m.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mode === "click" && (
        <Field
          label="Click reference"
          htmlFor="s-clickref"
          required
          error={errors.clickRef?.message}
          hint="The pz value the brand passed back with the order"
        >
          <Input
            id="s-clickref"
            placeholder="pz_9f2ka1…"
            className="font-mono"
            {...register("clickRef")}
          />
        </Field>
      )}

      {mode === "code" && (
        <Field
          label="Discount code"
          htmlFor="s-code"
          required
          error={errors.discountCode?.message}
          hint="Matched case-insensitively, the way the importer reads it"
        >
          <Input id="s-code" placeholder="RACHEL10" {...register("discountCode")} />
        </Field>
      )}

      {mode === "listing" && (
        <Field
          label="Creator listing"
          htmlFor="s-listing"
          required
          error={errors.listingId?.message}
          hint={
            brandId
              ? "Only this brand's listings are shown"
              : "Choose a brand first"
          }
        >
          <Select
            id="s-listing"
            defaultValue=""
            disabled={!brandId}
            {...register("listingId")}
          >
            <option value="" disabled>
              {brandId ? "Choose a listing" : "Choose a brand first"}
            </option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Order reference"
          htmlFor="s-orderref"
          hint="Optional"
          error={errors.orderRef?.message}
        >
          <Input
            id="s-orderref"
            placeholder="Brand's own order number"
            className="font-mono"
            {...register("orderRef")}
          />
        </Field>
        <Field
          label="Sale date"
          htmlFor="s-date"
          required
          error={errors.soldAt?.message}
        >
          <Input id="s-date" type="date" {...register("soldAt")} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Record sale
        </Button>
      </div>
    </form>
  );
}
