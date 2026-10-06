"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Cloudflare Turnstile challenge widget.
 *
 * Loads the Turnstile script once and renders the widget into a plain div,
 * handing the token back through `onVerify` so the form can submit it with
 * the rest of its fields. Expiry and errors clear the token through
 * `onExpire`, because a stale token only buys the user a failed submission.
 * A token is single use: the server consumes it on every attempt, so forms
 * remount the widget (via `key`) after each submit to issue a fresh one.
 *
 * Renders nothing when no site key is configured. The server skips
 * verification in development without one, and fails closed in production.
 */
export function TurnstileWidget({
  onVerify,
  onExpire,
}: {
  /** Receives the token to submit with the form. */
  onVerify: (token: string) => void;
  /** Fires when the token expires or errors, so the form clears it. */
  onExpire?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire });

  // The widget must not re-render when the callbacks change identity, so it
  // reads them through a ref that always holds the latest pair.
  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire };
  });

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function renderWidget() {
    const container = containerRef.current;
    const api = window.turnstile;
    if (!container || !api || !siteKey || widgetIdRef.current) return;
    widgetIdRef.current = api.render(container, {
      sitekey: siteKey,
      theme: "dark",
      callback: (token) => callbacksRef.current.onVerify(token),
      "expired-callback": () => callbacksRef.current.onExpire?.(),
      "error-callback": () => callbacksRef.current.onExpire?.(),
    });
  }

  useEffect(() => {
    // Covers the script already being loaded, e.g. when moving between the
    // sign-in and sign-up pages in one session.
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // Render once on mount only; callbacks flow through the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
