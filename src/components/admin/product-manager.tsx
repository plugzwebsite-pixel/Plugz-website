"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Badge } from "@/components/ui/primitives";
import { patchJson, postJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";
import { parseProductPrice } from "@/lib/product-price";

type VideoRow = {
  id: string;
  uid: string;
  state: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  review: "PENDING" | "APPROVED" | "REMOVED";
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  removedReason: string | null;
  pendingUid?: string | null;
  replacementState?: "UPLOADING" | "PROCESSING" | "FAILED" | null;
};

export type ManagedProduct = {
  id: string;
  product: string;
  description: string | null;
  imageUrl: string | null;
  pricePence: number | null;
  category: string;
  destination: string;
  review: string | null;
  rating: number | null;
  live: boolean;
  video: VideoRow | null;
};

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function ProductManager({
  row,
  categories,
  videoEnabled,
}: {
  row: ManagedProduct;
  categories: string[];
  videoEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [video, setVideo] = useState<VideoRow | null>(row.video);
  const [form, setForm] = useState({
    name: row.product,
    description: row.description ?? "",
    imageUrl: row.imageUrl ?? "",
    price: row.pricePence === null ? "" : (row.pricePence / 100).toFixed(2),
    category: row.category,
    sourceUrl: row.destination,
    review: row.review ?? "",
    rating: row.rating ? String(row.rating) : "",
    live: row.live,
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const currentProcessing = video && video.state !== "READY" && video.state !== "FAILED";
    const replacementProcessing =
      video?.replacementState === "UPLOADING" || video?.replacementState === "PROCESSING";
    if (!open || !video || (!currentProcessing && !replacementProcessing)) return;
    let alive = true;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/admin/videos/${video.id}`);
      const json = await response.json().catch(() => null);
      if (alive && response.ok && json?.data) {
        setVideo(json.data);
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [open, video]);

  async function save() {
    setErrors({});
    const price = parseProductPrice(form.price);
    if (!price.ok) {
      setErrors({ price: price.message });
      toast.error("Check the product price", price.message);
      return;
    }
    setBusy(true);
    const response = await patchJson(`/api/admin/products/${row.id}`, {
      product: {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        pricePence: price.pence,
        category: form.category,
        sourceUrl: form.sourceUrl.trim(),
      },
      listing: {
        review: form.review.trim() || null,
        rating: form.rating ? Number(form.rating) : null,
        live: form.live,
      },
    });
    setBusy(false);
    if (!response.ok) {
      const apiErrors = response.errors ?? {};
      setErrors({
        name: apiErrors.name ?? apiErrors["product.name"] ?? "",
        description: apiErrors.description ?? apiErrors["product.description"] ?? "",
        imageUrl: apiErrors.imageUrl ?? apiErrors["product.imageUrl"] ?? "",
        price: apiErrors.pricePence ?? apiErrors["product.pricePence"] ?? "",
        category: apiErrors.category ?? apiErrors["product.category"] ?? "",
        sourceUrl: apiErrors.sourceUrl ?? apiErrors["product.sourceUrl"] ?? "",
        review: apiErrors.review ?? apiErrors["listing.review"] ?? "",
        rating: apiErrors.rating ?? apiErrors["listing.rating"] ?? "",
      });
      toast.error("Couldn't save that product", response.message);
      return;
    }
    toast.success("Product updated", "The website cache has been refreshed.");
    setOpen(false);
    router.refresh();
  }

  async function togglePublished() {
    const next = !form.live;
    setBusy(true);
    const response = await patchJson(`/api/admin/products/${row.id}`, {
      listing: { review: form.review.trim() || null, rating: form.rating ? Number(form.rating) : null, live: next },
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Couldn't update the website", response.message);
      return;
    }
    set("live")(next);
    toast.success(next ? "Product restored" : "Product removed from the website");
    setOpen(false);
    router.refresh();
  }

  async function uploadVideo(file: File) {
    if (!file.type.startsWith("video/") || file.size > MAX_VIDEO_BYTES) {
      toast.error("Choose a video up to 200MB");
      return;
    }
    setVideoBusy(true);
    setProgress(0);
    const previousVideo = video;
    let started: { id: string; uploadUid: string } | null = null;
    try {
      const start = await postJson<VideoRow & {
        uploadUid: string;
        uploadUrl: string;
        replacing: boolean;
      }>(
        "/api/admin/videos",
        { listingId: row.id }
      );
      if (!start.ok) throw new Error(start.message || "Couldn't start upload");
      started = { id: start.data!.id, uploadUid: start.data!.uploadUid };
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", start.data!.uploadUrl);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => xhr.status < 400 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Upload failed"));
        const body = new FormData();
        body.append("file", file);
        xhr.send(body);
      });
      setVideo(
        start.data!.replacing && previousVideo
          ? {
              ...previousVideo,
              pendingUid: start.data!.uploadUid,
              replacementState: "PROCESSING",
            }
          : { ...start.data!, state: "PROCESSING" }
      );
      toast.success(
        start.data!.replacing ? "Replacement uploaded" : "Video uploaded",
        start.data!.replacing
          ? "The original remains live until the replacement is ready."
          : "It will appear when processing finishes."
      );
    } catch (error) {
      if (started) {
        await postJson(`/api/admin/videos/${started.id}`, {
          action: "cancel-upload",
          uid: started.uploadUid,
        });
      }
      setVideo(previousVideo);
      toast.error("Video upload failed", error instanceof Error ? error.message : undefined);
    } finally {
      setVideoBusy(false);
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeVideo() {
    if (!video) return;
    setVideoBusy(true);
    const response = await postJson(`/api/admin/videos/${video.id}`, {
      action: "remove",
      reason: "Removed by an administrator.",
    });
    setVideoBusy(false);
    if (!response.ok) {
      toast.error("Couldn't remove the video", response.message);
      return;
    }
    setVideo({ ...video, review: "REMOVED", removedReason: "Removed by an administrator." });
    toast.success("Video removed from the website");
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label={`Manage ${row.product}`}>
        <Pencil size={14} /> Manage
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Manage ${row.product}`}>
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-md border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-text-strong">Manage product</h2>
                <p className="mt-1 text-sm text-text-muted">Product details update every creator page for this item. The quote and rating apply to this creator only.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text-strong" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Product name" error={errors.name}><Input invalid={Boolean(errors.name)} value={form.name} maxLength={200} onChange={(e) => set("name")(e.target.value)} /></Field>
              <Field label="Price (GBP)" error={errors.price}><Input invalid={Boolean(errors.price)} inputMode="decimal" value={form.price} onChange={(e) => set("price")(e.target.value)} placeholder="49.99" /></Field>
              <Field label="Category" error={errors.category} hint={!categories.includes(row.category) && form.category === row.category ? "This category is inactive. You can still edit other fields, or choose an active category." : undefined}><Select invalid={Boolean(errors.category)} value={form.category} onChange={(e) => set("category")(e.target.value)}>{!categories.includes(row.category) && <option value={row.category}>{row.category} (inactive)</option>}{categories.map((category) => <option key={category}>{category}</option>)}</Select></Field>
              <Field label="Rating" error={errors.rating}><Select invalid={Boolean(errors.rating)} value={form.rating} onChange={(e) => set("rating")(e.target.value)}><option value="">No rating</option>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}</Select></Field>
            </div>
            <Field label="Creator quote / comment" className="mt-4" error={errors.review} hint="Shown as the creator's endorsement on this product page."><Textarea invalid={Boolean(errors.review)} value={form.review} maxLength={1000} onChange={(e) => set("review")(e.target.value)} /></Field>
            <Field label="Product description" className="mt-4" error={errors.description}><Textarea invalid={Boolean(errors.description)} value={form.description} maxLength={4000} onChange={(e) => set("description")(e.target.value)} /></Field>
            <Field label="Product image address" className="mt-4" error={errors.imageUrl}><Input invalid={Boolean(errors.imageUrl)} value={form.imageUrl} maxLength={1000} onChange={(e) => set("imageUrl")(e.target.value)} /></Field>
            <Field label="Brand product address" className="mt-4" error={errors.sourceUrl}><Input invalid={Boolean(errors.sourceUrl)} value={form.sourceUrl} maxLength={1000} onChange={(e) => set("sourceUrl")(e.target.value)} /></Field>

            <div className="mt-6 rounded-sm border border-border bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-text-strong">Product video</p>
                  <p className="text-xs text-text-faint">MP4, MOV or another browser video format; up to 200MB and 3 minutes.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {video?.state === "READY" && video.review !== "REMOVED" && <Badge tone="green">Live</Badge>}
                  {(video?.replacementState === "UPLOADING" || video?.replacementState === "PROCESSING") && <Badge tone="amber">Replacing — original remains live</Badge>}
                  {video?.replacementState === "FAILED" && <Badge tone="neutral">Replacement failed — original kept</Badge>}
                  {video && video.state !== "READY" && video.review !== "REMOVED" && <Badge tone="amber">{video.state.toLowerCase()}</Badge>}
                  {video?.review === "REMOVED" && <Badge tone="neutral">Removed</Badge>}
                  {video && video.review !== "REMOVED" && <Button type="button" size="sm" variant="ghost" loading={videoBusy} onClick={removeVideo}><Trash2 size={14} /> Remove video</Button>}
                  <Button type="button" size="sm" variant="secondary" loading={videoBusy} disabled={!videoEnabled} onClick={() => fileInput.current?.click()}>
                    <Clapperboard size={14} /> {progress === null ? (video ? "Replace video" : "Upload video") : `Uploading ${progress}%`}
                  </Button>
                  <input ref={fileInput} type="file" accept="video/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadVideo(file); }} />
                </div>
              </div>
              {!videoEnabled && <p className="mt-2 text-xs text-amber-300">Cloudflare Stream is not configured on this server.</p>}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <Button type="button" variant={form.live ? "danger" : "secondary"} loading={busy} onClick={togglePublished}>
                {form.live ? <><Trash2 size={15} /> Remove from website</> : "Restore to website"}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="button" loading={busy} onClick={save}>Save changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
