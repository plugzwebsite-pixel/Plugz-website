"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { compact } from "@/lib/utils";
import { postJson } from "@/lib/client/api";

type Row = {
  line: number;
  name: string;
  email: string;
  handle: string;
  category: string;
  city: string;
  followers: { instagram: number; tiktok: number; youtube: number };
  avatarUrl: string | null;
  status: "ready" | "skipped" | "error";
  reason?: string;
};

type Preview = {
  total: number;
  ready: number;
  skipped: number;
  errors: number;
  results: Row[];
};

const TEMPLATE = `name,email,handle,category,city,image,instagram followers,tiktok followers,youtube followers
Freya Sinclair,freya@example.com,freyasinclair,Women's Fashion,London,freyasinclair.jpg,342000,128000,0
Aisha Bello,aisha@example.com,aishabello,Beauty & Skincare,London,https://example.com/aisha.jpg,128k,64k,12k`;

export function ImportCreators() {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ created: number; invited: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setPreview(null);
    setDone(null);
  }

  async function check() {
    setChecking(true);
    const res = await postJson<Preview>("/api/admin/creators/import", {
      csv,
      commit: false,
    });
    setChecking(false);
    if (!res.ok) {
      toast.error("Couldn't read that file", res.message);
      return;
    }
    setPreview(res.data ?? null);
  }

  async function commit() {
    if (!preview?.ready) return;
    setImporting(true);
    const res = await postJson<{ created: number; invited: number }>(
      "/api/admin/creators/import",
      { csv, commit: true }
    );
    setImporting(false);
    if (!res.ok) {
      toast.error("Import failed", res.message);
      return;
    }
    setDone(res.data ?? null);
    setPreview(null);
    toast.success(
      `${res.data?.created ?? 0} creators added`,
      "Invites are on their way."
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-md border border-accent-green/25 bg-accent-green/[0.06] p-8 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-green/15">
          <MailCheck className="text-accent-green" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          {done.created} creator{done.created === 1 ? "" : "s"} added
        </h2>
        <p className="mx-auto mt-3 max-w-md text-text-muted">
          {done.invited} invite{done.invited === 1 ? "" : "s"} sent. Each creator
          sets their own password and releases their profile before it goes
          live — nothing is public until they do.
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          onClick={() => {
            setDone(null);
            setCsv("");
          }}
        >
          Import another file
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-text-strong">
            Upload a spreadsheet
          </h2>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} /> Choose CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCsv(TEMPLATE);
                setPreview(null);
              }}
            >
              <FileSpreadsheet size={15} /> Use template
            </Button>
          </div>
        </div>

        <p className="mt-2 text-sm text-text-muted">
          Columns: <code className="text-xs">name, email, handle, category,
          city, image, instagram followers, tiktok followers, youtube
          followers</code>. Follower counts can be written as{" "}
          <code className="text-xs">128000</code>,{" "}
          <code className="text-xs">128k</code> or{" "}
          <code className="text-xs">1.2M</code>.
        </p>
        <p className="mt-1.5 text-xs text-text-faint">
          <span className="font-medium text-text-muted">Photos:</span> put a full
          image URL in the <code>image</code> column, or just the filename if the
          photos have been placed in <code>public/images/creators/</code>. Leave
          it blank and we&apos;ll look for a file named after the handle. Anyone
          without a usable photo falls back to their initials.
        </p>

        <Textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setPreview(null);
          }}
          rows={8}
          placeholder="Paste the CSV here, or choose a file above…"
          className="mt-4 font-mono text-xs"
        />

        <div className="mt-4 flex justify-end">
          <Button onClick={check} loading={checking} disabled={!csv.trim()}>
            Check the file
          </Button>
        </div>
      </div>

      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-border bg-surface"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-text-strong">
              Nothing has been created yet
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{preview.ready} ready</Badge>
              {preview.skipped > 0 && (
                <Badge tone="amber">{preview.skipped} already exist</Badge>
              )}
              {preview.errors > 0 && (
                <Badge tone="neutral">{preview.errors} need fixing</Badge>
              )}
            </div>
          </div>

          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-6 py-3 font-medium">Row</th>
                  <th className="px-6 py-3 font-medium">Creator</th>
                  <th className="px-6 py-3 font-medium">Handle</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Reach</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.results.map((r) => {
                  const total =
                    r.followers.instagram + r.followers.tiktok + r.followers.youtube;
                  return (
                    <tr key={r.line} className="border-t border-border">
                      <td className="px-6 py-3 text-text-faint">{r.line}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          {/* Shows whether the photo actually resolved, before
                              anything is created — a broken thumbnail here is
                              cheaper to fix than thirty wrong profiles. */}
                          <Avatar
                            name={r.name || "?"}
                            src={r.avatarUrl ?? undefined}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-strong">
                              {r.name || "—"}
                            </p>
                            <p className="truncate text-xs text-text-faint">
                              {r.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-text-muted">
                        {r.handle ? `@${r.handle}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-text-muted">
                        {r.category || "—"}
                      </td>
                      <td className="px-6 py-3 text-text-muted">
                        {total > 0 ? compact(total) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {r.status === "ready" ? (
                          <span className="inline-flex items-center gap-1.5 text-accent-green">
                            <CheckCircle2 size={14} /> Ready
                          </span>
                        ) : r.status === "skipped" ? (
                          <span className="inline-flex items-center gap-1.5 text-accent-gold">
                            <AlertTriangle size={14} /> {r.reason}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400">
                            <XCircle size={14} /> {r.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <p className="text-sm text-text-muted">
              {preview.ready > 0
                ? `${preview.ready} creator${preview.ready === 1 ? "" : "s"} will be added and sent an invite email.`
                : "Nothing to import — fix the rows above and check again."}
            </p>
            <Button onClick={commit} loading={importing} disabled={!preview.ready}>
              Add {preview.ready} creator{preview.ready === 1 ? "" : "s"} &amp; send invites
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
