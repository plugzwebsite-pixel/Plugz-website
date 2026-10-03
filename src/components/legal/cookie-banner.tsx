"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "pluggz-cookie-consent";
/** Fired by the "Cookie settings" link in the footer to bring the banner back. */
export const OPEN_COOKIE_SETTINGS = "pluggz:cookie-settings";

export type CookieChoice = "all" | "essential";

/**
 * The visitor's recorded choice, or null if they have not made one.
 *
 * Anything optional added later (analytics, advertising pixels) must check
 * this returns "all" before it loads.
 */
export function cookieChoice(): CookieChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: string };
    return parsed.choice === "all" || parsed.choice === "essential" ? parsed.choice : null;
  } catch {
    return null;
  }
}

/**
 * Cookie notice shown on a visitor's first visit, until they choose.
 *
 * Not shown on the demo shop, which stands in for a brand's own website and
 * must not look like Pluggz.
 */
export function CookieBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Deferred so the first paint matches the server render, which cannot
    // know what this browser has stored.
    const task = window.setTimeout(() => setOpen(cookieChoice() === null), 0);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => {
      window.clearTimeout(task);
      window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
    };
  }, []);

  function choose(choice: CookieChoice) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() })
      );
    } catch {
      /* private browsing: the banner simply returns next visit */
    }
    setOpen(false);
  }

  if (!open || pathname?.startsWith("/demo")) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl animate-rise rounded-lg border border-border-strong bg-surface/95 p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex gap-3">
          <Cookie size={22} className="mt-0.5 shrink-0 text-brand-pink" aria-hidden />
          <div>
            <p id="cookie-banner-title" className="font-semibold text-text-strong">
              We use cookies
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              Essential cookies keep Pluggz working and make sure creators are
              credited for the products they recommend. With your permission we
              also use cookies to understand how the site is used. Read our{" "}
              <Link
                href="/legal/cookies"
                className="text-text-strong underline underline-offset-4 hover:text-brand-pink"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5 sm:flex-col">
          <button
            type="button"
            onClick={() => choose("all")}
            className="min-h-11 flex-1 rounded-pill bg-grad-brand px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="min-h-11 flex-1 rounded-pill border border-border-strong px-5 text-sm font-semibold text-text-strong transition-colors hover:bg-surface-2"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner so a visitor can change their mind. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
