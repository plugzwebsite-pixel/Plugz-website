"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

type Result = {
  line: number;
  order: string;
  value: string;
  outcome: string;
};

type Preview = {
  dryRun: boolean;
  total: number;
  recorded: number;
  skipped: number;
  results: Result[];
};

/**
 * Loading a brand's sales report.
 *
 * Always previews first. A row matched to the wrong listing pays the wrong
 * creator, and once commission has been written and a payout has run, unpicking
 * it is a manual job, so the preview is not a nicety, it is the check.
 */
export function ImportSales() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(commit: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("commit", String(commit));
      const res = await fetch("/api/admin/sales/import", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.message ?? "Couldn't read that file.");
        return;
      }
      if (commit) {
        setDone(json.data);
        setPreview(null);
        setFile(null);
        if (input.current) input.current.value = "";
      } else {
        setPreview(json.data);
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-accent-green" />
          <div>
            <h2 className="font-medium text-text-strong">
              {`${done.recorded} ${done.recorded === 1 ? "sale" : "sales"} recorded`}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {done.skipped > 0
                ? `${done.skipped} rows were skipped and nothing was recorded for them.`
                : "Every row matched."}{" "}
              Commission is calculated and each sale is now in the payout
              pipeline, pending its return window.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              onClick={() => setDone(null)}
            >
              Import another report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-medium text-text-strong">Upload the brand&apos;s report</h2>
        <p className="mt-1 text-sm text-text-muted">
          A CSV with a header row. Columns are matched by name, so the brand&apos;s
          own export usually works as it comes.
        </p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text">Order value (required)</dt>
            <dd className="text-text-faint">value, amount, total or order value</dd>
          </div>
          <div>
            <dt className="text-text">Who earned it (one of these)</dt>
            <dd className="text-text-faint">
              pz / clickref, or discount code, or creator + product
            </dd>
          </div>
          <div>
            <dt className="text-text">Order reference (optional)</dt>
            <dd className="text-text-faint">order ref, order id or reference</dd>
          </div>
          <div>
            <dt className="text-text">Date (optional)</dt>
            <dd className="text-text-faint">date or order date; today if absent</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <FileSpreadsheet size={16} />
            {file ? "Choose a different file" : "Choose CSV"}
          </Button>
          {file && (
            <>
              <span className="text-sm text-text-muted">{file.name}</span>
              <Button type="button" onClick={() => send(false)} disabled={busy}>
                <Upload size={16} />
                {busy ? "Checking…" : "Preview"}
              </Button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setError(null);
          }}
        />
      </div>

      {preview && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-text-strong">Nothing has been recorded yet</h2>
            <Badge tone="green">{preview.recorded} will record</Badge>
            {preview.skipped > 0 && (
              <Badge tone="amber">{preview.skipped} will be skipped</Badge>
            )}
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase tracking-wide text-text-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">Line</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {preview.results.map((r) => (
                  <tr key={r.line} className="border-t border-border">
                    <td className="px-3 py-2 text-text-faint">{r.line}</td>
                    <td className="px-3 py-2 text-text">{r.order || "Not given"}</td>
                    <td className="px-3 py-2 text-text">{r.value}</td>
                    <td
                      className={
                        r.outcome.startsWith("Skipped")
                          ? "px-3 py-2 text-amber-400"
                          : "px-3 py-2 text-accent-green"
                      }
                    >
                      {r.outcome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-text-muted">
            Check the creators these are about to pay before committing. A row
            matched to the wrong listing pays the wrong person.
          </p>

          <Button
            className="mt-4"
            onClick={() => send(true)}
            disabled={busy || preview.recorded === 0}
          >
            {busy
              ? "Recording…"
              : `Record ${preview.recorded} ${preview.recorded === 1 ? "sale" : "sales"}`}
          </Button>
        </div>
      )}
    </div>
  );
}
