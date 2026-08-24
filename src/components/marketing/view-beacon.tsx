"use client";

import { useEffect } from "react";

/**
 * Tells the server this page was looked at.
 *
 * A component rather than something in the page itself, because the product
 * pages are prerendered and counting during the render would make every one of
 * them dynamic. This runs in the browser, after the page is already on screen,
 * so nothing about the page waits for it.
 *
 * Once per page load, and the server drops repeats from the same session within
 * the hour, so a shopper going back and forth between two products does not
 * count four times.
 */
export function ViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    // A page reopened from the back/forward cache fires this again, and the
    // session key stops that becoming a second view.
    const key = `pz-seen:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing refuses storage. Counting twice is better than not at
      // all, so carry on rather than returning.
    }

    const body = JSON.stringify({ listingId });

    // sendBeacon survives the shopper tapping straight through to the brand,
    // which is exactly the visit worth counting and exactly the one a normal
    // fetch would lose when the page unloads.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track/view", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // A missed view is a missed statistic, never an error a shopper sees.
    });
  }, [listingId]);

  return null;
}
