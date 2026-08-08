"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Portrait control for a creator's own profile.
 *
 * The preview is drawn from the chosen file before anything is uploaded, so
 * the crop is visible immediately — a portrait is square and centre-weighted on
 * the server, and people want to see that happen rather than read about it.
 */
export function AvatarUpload({
  name,
  currentUrl,
}: {
  name: string;
  currentUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function upload(file: File) {
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await fetch("/api/creator/avatar", { method: "POST", body });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setPreview(null);
        toast.error("Couldn't upload that photo", json?.message);
        return;
      }
      setUrl(json.data.avatarUrl);
      setPreview(null);
      toast.success("Photo updated", "It's live on your storefront now.");
    } catch {
      setPreview(null);
      toast.error("Couldn't reach the server", "Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/creator/avatar", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't remove that photo");
        return;
      }
      setUrl(null);
      setPreview(null);
      toast.success("Photo removed", "Your initials show until you add another.");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? url;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <Avatar name={name} src={shown ?? undefined} size="xl" ring />
      </span>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Camera size={15} />
            {busy ? "Uploading…" : url ? "Change photo" : "Add a photo"}
          </Button>

          {url && !busy && (
            <Button type="button" variant="ghost" size="sm" onClick={remove}>
              <Trash2 size={15} />
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-text-faint">
          Square works best. JPG, PNG or WebP, at least 400×400, up to 8MB.
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
