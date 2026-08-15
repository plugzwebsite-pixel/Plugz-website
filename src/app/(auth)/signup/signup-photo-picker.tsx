"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Portrait picker on the creator application.
 *
 * Optional on purpose: an application shouldn't be blocked on finding a good
 * photo, and it can be added from settings later. But the wall of creators on
 * the homepage is the first thing a shopper sees, so asking here is what makes
 * it fill up.
 *
 * The file is only held client-side and posted with the application; nothing
 * uploads until the account is actually created.
 */
export function SignupPhotoPicker({
  onChange,
}: {
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke the object URL when it is replaced or the form unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choose(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is over 8MB. Try a smaller one.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function clear() {
    setPreview(null);
    setError(null);
    onChange(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="rounded-md border border-border bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="relative">
          <Avatar name="" src={preview ?? undefined} size="xl" ring />
          {preview && (
            <button
              type="button"
              onClick={clear}
              aria-label="Remove photo"
              className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:text-text-strong"
            >
              <X size={13} />
            </button>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-brand-pink/60 hover:text-text-strong"
          >
            <Camera size={15} />
            {preview ? "Choose a different photo" : "Add your photo"}
          </button>
          <p className="mt-2 text-xs text-text-faint">
            Optional, and you can add one later. Square works best, in JPG, PNG or
            WebP, up to 8MB.
          </p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0])}
      />
    </div>
  );
}
