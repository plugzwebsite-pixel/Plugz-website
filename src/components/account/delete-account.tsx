"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

/**
 * The danger zone on the account page.
 *
 * Deleting is a two-step confirmation on purpose: the password is asked
 * again, then a final confirmation, because this is the one action a stolen
 * session must not take quietly. On success the session is cleared and the
 * sign-in page is shown.
 */
export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (!password) {
      toast.error("Enter your password", "It confirms this is really you.");
      return;
    }
    if (
      !window.confirm(
        "Delete your account?\n\nYour details, saved items and preferences are removed for good. This cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    // The password goes in the body, which deleteJson does not support: a
    // request that removes something carries its identifier in the address,
    // but there is no identifier here beyond the session itself.
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.ok === false) {
      setBusy(false);
      toast.error("Couldn't delete your account", payload?.message);
      return;
    }
    // The account is gone; clear what is left of the session.
    await postJson("/api/auth/logout", {});
    router.push("/login");
  }

  return (
    <section className="mt-6 rounded-md border border-red-500/25 bg-surface p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <Trash2 size={18} className="mt-0.5 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold text-text-strong">
            Delete your account
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            This permanently removes your account, your saved items and your
            preferences. Anything you asked to be kept for a dispute is kept
            only as long as the law requires.
          </p>
          <div className="mt-4 flex max-w-sm flex-col gap-2.5">
            <label
              htmlFor="delete-password"
              className="text-xs font-medium text-text-muted"
            >
              Enter your password to confirm
            </label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && remove()}
              placeholder="Your password"
            />
            <div>
              <Button
                variant="danger"
                loading={busy}
                onClick={remove}
                disabled={!password}
              >
                <Trash2 size={15} /> Delete my account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
