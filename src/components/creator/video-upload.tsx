"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Trash2, TriangleAlert } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

/**
 * A creator adding a clip to one of their listings.
 *
 * The file goes from here straight to Cloudflare using a one-time address, so
 * a two hundred megabyte video from somebody's phone never passes through our
 * server. What comes back is an identifier, and the clip appears on the
 * storefront as soon as Cloudflare says it is playable.
 *
 * Encoding takes anything from a few seconds to a couple of minutes, so this
 * asks how it is getting on while the page is open. A webhook does the same job
 * for creators who upload and immediately close the tab, which is most of them.
 */

type VideoRow = {
  id: string;
  uid: string;
  state: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  review: "PENDING" | "APPROVED" | "REMOVED";
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  removedReason: string | null;
};

const MAX_BYTES = 200 * 1024 * 1024;

export function VideoUpload({
  listingId,
  initial,
  configured,
}: {
  listingId: string;
  initial: VideoRow | null;
  configured: boolean;
}) {
  const [video, setVideo] = useState<VideoRow | null>(initial);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Ask how encoding is going, but only while it is actually encoding, and stop
  // as soon as it settles. A poll that runs for ever on a finished video is a
  // request every few seconds from every open storefront tab.
  useEffect(() => {
    if (!video || video.state === "READY" || video.state === "FAILED") return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/creator/videos/${video.id}`);
        const json = await res.json().catch(() => null);
        if (!alive || !json?.ok) return;
        setVideo(json.data);
      } catch {
        // A dropped poll is not worth telling anybody about; the next one runs.
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [video]);

  async function choose(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("That file is too large", "Videos up to 200MB, and three minutes long.");
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const start = await postJson<{ id: string; uid: string; uploadUrl: string }>(
        "/api/creator/videos",
        { listingId }
      );
      if (!start.ok) {
        toast.error("Couldn't start that upload", start.message);
        return;
      }

      // XHR rather than fetch, only because fetch still cannot report upload
      // progress, and a creator watching a two minute upload with no feedback
      // assumes it has hung and starts again.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", start.data!.uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(String(xhr.status))));
        xhr.onerror = () => reject(new Error("network"));
        const body = new FormData();
        body.append("file", file);
        xhr.send(body);
      });

      setVideo({
        id: start.data!.id,
        uid: start.data!.uid,
        state: "PROCESSING",
        review: "PENDING",
        durationSeconds: null,
        thumbnailUrl: null,
        removedReason: null,
      });

      toast.success("Uploaded", "It appears on your storefront once it has processed.");
    } catch {
      toast.error("That upload didn't finish", "Check your connection and try again.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove() {
    if (!video?.id) return;
    if (!window.confirm("Remove this video from your storefront?")) return;
    setBusy(true);
    const res = await fetch(`/api/creator/videos/${video.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't remove that video");
      return;
    }
    setVideo(null);
    toast.success("Video removed");
  }

  if (!configured) {
    return (
      <p className="text-xs text-text-faint">
        Video uploads are not switched on yet.
      </p>
    );
  }

  if (video?.review === "REMOVED") {
    return (
      <div className="rounded-sm border border-amber-500/30 bg-amber-500/[0.06] p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-amber-300">
          <TriangleAlert size={14} /> This video was taken down
        </p>
        {video.removedReason && (
          <p className="mt-1 text-xs text-text-muted">{video.removedReason}</p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          Upload a different one
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void choose(f);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {video && video.state !== "FAILED" ? (
        <>
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="h-12 w-20 shrink-0 rounded-sm border border-border object-cover"
            />
          ) : (
            <span className="grid h-12 w-20 shrink-0 place-items-center rounded-sm border border-border bg-surface-2 text-text-faint">
              <Clapperboard size={16} />
            </span>
          )}
          <div className="min-w-0">
            {video.state === "READY" ? (
              <Badge tone="green">Live on your storefront</Badge>
            ) : (
              <Badge tone="amber">Processing</Badge>
            )}
            {video.durationSeconds ? (
              <p className="mt-1 text-xs text-text-faint">{video.durationSeconds} seconds</p>
            ) : null}
          </div>
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
            <Trash2 size={14} /> Remove
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Replace
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Clapperboard size={15} />
          {busy && progress !== null ? `Uploading ${progress}%` : "Add a video"}
        </Button>
      )}

      {video?.state === "FAILED" && (
        <span className="text-xs text-red-400">
          That file could not be processed. Try a different one.
        </span>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void choose(f);
        }}
      />
    </div>
  );
}
