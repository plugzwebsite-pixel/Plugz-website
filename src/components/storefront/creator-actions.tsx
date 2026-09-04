"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2, Check } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Follow and Share, which until now were two buttons that did nothing.
 *
 * Neither had a handler. They rendered, they had hover states, and pressing
 * them was the same as pressing the background. A control that looks like it
 * works and does not is worse than one that is missing, because nobody reports
 * a button they can see.
 *
 * Follow needs an account, so somebody signed out is sent to sign in and
 * brought back to the storefront they were on rather than dropped on the
 * homepage. Share uses the device's own share sheet where there is one, which
 * on a phone is what a shopper expects, and falls back to copying the address.
 */
/**
 * Put a string on the clipboard, by whichever route the browser allows.
 *
 * The modern API needs a secure context and the browser's permission, and
 * quietly refuses in an embedded view or an older browser. The older selection
 * trick has neither requirement and still works nearly everywhere, so it is
 * worth trying before giving up on somebody who only wanted to send a link.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the older route.
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    document.body.removeChild(field);
    return done;
  } catch {
    return false;
  }
}

export function CreatorActions({ handle, name }: { handle: string; name: string }) {
  const [following, setFollowing] = useState(false);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Whether this visitor already follows them. The page itself is cached and
  // shared by everybody, so this cannot be rendered on the server: it would
  // show one visitor's answer to the next.
  useEffect(() => {
    let live = true;
    fetch(`/api/follow?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (!live || !r?.ok) return;
        setFollowing(Boolean(r.data?.following));
        setKnown(true);
      })
      .catch(() => {
        // Not knowing is not an error worth showing. The button still works.
      });
    return () => {
      live = false;
    };
  }, [handle]);

  async function toggleFollow() {
    setBusy(true);
    const next = !following;
    const res = await postJson<{ following: boolean }>("/api/follow", {
      handle,
      following: next,
    });
    setBusy(false);

    if (res.status === 401) {
      router.push(`/login?next=${encodeURIComponent(`/@${handle}`)}`);
      return;
    }
    if (!res.ok) {
      toast.error("That did not work", res.message);
      return;
    }

    setFollowing(next);
    setKnown(true);
    toast.success(
      next ? `Following ${name}` : `Unfollowed ${name}`,
      next
        ? "Their storefront is saved to your account."
        : "You will not see them in your following any more."
    );
  }

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const payload = {
      title: `${name} on Pluggz`,
      text: `${name}'s picks on Pluggz`,
      url,
    };

    // The device's own sheet where it exists. A cancelled share throws, and a
    // person changing their mind is not a failure worth reporting.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }

    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied", "Paste it wherever you like.");
      return;
    }

    // Neither route worked, which happens when the page is not allowed to
    // touch the clipboard. Show the address instead of an apology: the person
    // wanted the link, so give them the link.
    toast.error("Copy this link", url);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={following ? "primary" : "secondary"}
        size="sm"
        onClick={toggleFollow}
        loading={busy}
        aria-pressed={known ? following : undefined}
      >
        <Heart size={15} className={following ? "fill-current" : ""} />
        {following ? "Following" : "Follow"}
      </Button>
      <Button variant="outline" size="sm" onClick={share}>
        {copied ? <Check size={15} /> : <Share2 size={15} />}
        {copied ? "Copied" : "Share"}
      </Button>
    </div>
  );
}
