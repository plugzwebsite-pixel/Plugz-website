"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Save a product to come back to.
 *
 * The signed-out state is deliberately not hidden. A shopper who taps this and
 * is asked to make an account has just told us they want one, which is a far
 * better moment to ask than a banner they never asked for.
 *
 * Whether it is already saved is resolved on the client, so the product page
 * stays cacheable and is not rendered per visitor.
 */
export function SaveButton({
  listingId,
  productName,
  className,
  compact = false,
}: {
  listingId: string;
  productName: string;
  className?: string;
  /** The small circular version that sits on a card. */
  compact?: boolean;
}) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wishlist/state")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const ids: string[] = d?.data?.listingIds ?? [];
        setSignedIn(Boolean(d?.data?.signedIn));
        setSaved(ids.includes(listingId));
      })
      .catch(() => {
        if (!cancelled) {
          setSignedIn(false);
          setSaved(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function toggle() {
    if (signedIn === false) {
      router.push(`/signup/shopper?from=save`);
      return;
    }
    if (saved === null) return;

    const next = !saved;
    setSaved(next); // optimistic: the tap should feel instant
    setBusy(true);

    // A dropped connection throws rather than returning a response. Without
    // catching it the heart stays on the guess it made and the button never
    // re-enables, so the shopper is left with a save that never happened and
    // no way to try again.
    try {
      const res = next
        ? await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId }),
          })
        : await fetch(`/api/wishlist?listingId=${listingId}`, { method: "DELETE" });

      if (!res.ok) {
        setSaved(!next); // put it back
        if (res.status === 401) {
          router.push(`/signup/shopper?from=save`);
          return;
        }
        toast.error("Couldn't save that");
        return;
      }

      if (next) toast.success("Saved", `${productName} is in your saved items`);
    } catch {
      setSaved(!next);
      toast.error("Couldn't save that", "Check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  const label = saved ? `Remove ${productName} from saved` : `Save ${productName}`;

  if (compact) {
    return (
      <button
        onClick={(e) => {
          // The card is a link. Saving should not follow it.
          e.preventDefault();
          e.stopPropagation();
          void toggle();
        }}
        disabled={busy}
        aria-label={label}
        aria-pressed={saved ?? false}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60",
          saved && "bg-brand-pink hover:bg-brand-pink",
          className
        )}
      >
        <Heart size={15} fill={saved ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={label}
      aria-pressed={saved ?? false}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-pill border px-5 text-sm font-semibold transition-colors",
        saved
          ? "border-brand-pink bg-brand-pink/10 text-brand-pink"
          : "border-border text-text hover:border-border-strong hover:text-text-strong",
        className
      )}
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
