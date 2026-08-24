"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Play, Trash2 } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge, Pill } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

/**
 * The review queue for creator video.
 *
 * Watching the clip is the whole job, so the player opens in place rather than
 * on another page: a reviewer working through twenty of these should never lose
 * their position in the list.
 */

export type QueueVideo = {
  id: string;
  uid: string;
  state: string;
  review: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  removedReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  uploadedAt: string;
  creator: string;
  handle: string;
  product: string;
  brand: string;
  href: string;
};

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function VideoQueue({
  videos,
  show,
  counts,
}: {
  videos: QueueVideo[];
  show: string;
  counts: { pending: number; approved: number; removed: number };
}) {
  const [rows, setRows] = useState(videos);
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const toast = useToast();

  async function review(v: QueueVideo, action: "approve" | "remove") {
    let reason = "";
    if (action === "remove") {
      const given = window.prompt(
        `Why is this coming down?\n\nThe creator is told, so write something they can act on.`
      );
      if (given === null) return;
      reason = given.trim();
      if (reason.length < 3) {
        toast.error("Give a reason", "Even a few words is enough.");
        return;
      }
    }

    setBusy(v.id);
    const res = await postJson(`/api/admin/videos/${v.id}`, { action, reason: reason || undefined });
    setBusy(null);

    if (!res.ok) {
      toast.error("That didn't work", res.message);
      return;
    }
    // Dropped from the list rather than restyled in place: the list is one
    // review state, so a row that changed state no longer belongs in it.
    setRows((list) => list.filter((r) => r.id !== v.id));
    toast.success(action === "approve" ? "Kept" : "Taken down");
  }

  const tabs = [
    { key: "pending", label: `To review (${counts.pending})` },
    { key: "approved", label: `Kept (${counts.approved})` },
    { key: "removed", label: `Taken down (${counts.removed})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/videos?show=${t.key}`} scroll={false}>
            <Pill active={show === t.key}>{t.label}</Pill>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-16 text-center text-sm text-text-muted">
          {show === "pending"
            ? "Nothing waiting to be reviewed."
            : show === "approved"
              ? "Nothing kept yet."
              : "Nothing has been taken down."}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((v) => (
            <div key={v.id} className="rounded-md border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start gap-4">
                <button
                  type="button"
                  onClick={() => setPlaying(playing === v.id ? null : v.id)}
                  title="Watch it"
                  className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-2"
                >
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                    <Play size={18} />
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-strong">{v.product}</p>
                  <p className="truncate text-sm text-text-muted">
                    {v.brand} · {v.creator} (@{v.handle})
                  </p>
                  <p className="mt-1 text-xs text-text-faint">
                    Uploaded {when.format(new Date(v.uploadedAt))}
                    {v.durationSeconds ? ` · ${v.durationSeconds}s` : ""}
                    {v.state !== "READY" ? ` · ${v.state.toLowerCase()}` : ""}
                    {v.reviewedAt && v.reviewedBy
                      ? ` · reviewed by ${v.reviewedBy} on ${when.format(new Date(v.reviewedAt))}`
                      : ""}
                  </p>
                  {v.removedReason && (
                    <p className="mt-1.5 text-xs text-amber-300">{v.removedReason}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={v.href} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" title="The page a shopper sees">
                      <ExternalLink size={14} />
                    </Button>
                  </Link>
                  {v.review !== "APPROVED" && v.review !== "REMOVED" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === v.id}
                      onClick={() => review(v, "approve")}
                    >
                      <Check size={14} /> Keep
                    </Button>
                  )}
                  {v.review !== "REMOVED" && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy === v.id}
                      onClick={() => review(v, "remove")}
                    >
                      <Trash2 size={14} /> Take down
                    </Button>
                  )}
                  {v.review === "REMOVED" && <Badge tone="amber">Taken down</Badge>}
                </div>
              </div>

              {playing === v.id && v.state === "READY" && (
                <div className="mt-4 overflow-hidden rounded-sm border border-border">
                  <div className="relative w-full pt-[56.25%]">
                    <iframe
                      src={`https://iframe.videodelivery.net/${v.uid}`}
                      title={v.product}
                      allow="encrypted-media; picture-in-picture;"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
