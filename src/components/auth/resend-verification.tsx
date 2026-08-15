"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * The button on the status page that actually sends a new verification link.
 *
 * It reports what happened in place rather than navigating away. Someone who
 * is stuck waiting on an email needs to see that a new one has just gone out,
 * and to which address.
 */
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verified" | "error">("idle");
  const [message, setMessage] = useState("");

  async function resend() {
    setState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.data?.alreadyVerified) {
        setState("verified");
        return;
      }
      if (res.ok) {
        setState("sent");
        return;
      }
      setState("error");
      setMessage(body?.error ?? "Couldn't send that just now. Try again shortly.");
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-accent-green">
        {`Sent. A new link is on its way to ${email}. It's valid for 24 hours, and any older link has stopped working.`}
      </p>
    );
  }

  if (state === "verified") {
    return (
      <p className="text-sm text-accent-green">
        Your email is already confirmed. Reload this page to carry on.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={resend} disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Resend verification email"}
      </Button>
      {state === "error" && <p className="text-sm text-red-400">{message}</p>}
    </div>
  );
}
