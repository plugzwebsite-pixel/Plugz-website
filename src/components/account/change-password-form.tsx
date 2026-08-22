"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Changing your own password.
 *
 * Written once for every role rather than per area, because a creator, a brand
 * and a shopper all want the same three fields and the same rules.
 */
export function ChangePasswordForm() {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Checked here rather than at the server, because the confirmation exists
    // only to catch a typo and there is no reason to send it anywhere.
    if (f.password !== f.confirm) {
      setErrors({ confirm: "The two do not match" });
      return;
    }

    setSaving(true);
    const res = await postJson<{ changed: boolean }>("/api/account/password", {
      current: f.current,
      password: f.password,
    });
    setSaving(false);

    if (!res.ok) {
      setErrors(res.errors ?? {});
      toast.error("Couldn't change your password", res.message);
      return;
    }

    setF({ current: "", password: "", confirm: "" });
    toast.success("Password changed", "Use the new one next time you sign in.");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={17} className="text-text-muted" />
        <h2 className="font-medium text-text-strong">Change your password</h2>
      </div>
      <p className="mt-1.5 text-sm text-text-muted">
        You will stay signed in here. Any password reset links sent to you before
        now will stop working.
      </p>

      <div className="mt-5 grid gap-5 sm:max-w-md">
        <Field label="Current password" error={errors.current} required>
          <PasswordInput
            autoComplete="current-password"
            value={f.current}
            onChange={(e) => set("current")(e.target.value)}
          />
        </Field>
        <Field
          label="New password"
          hint="At least 8 characters, with a letter and a number"
          error={errors.password}
          required
        >
          <PasswordInput
            autoComplete="new-password"
            value={f.password}
            onChange={(e) => set("password")(e.target.value)}
          />
        </Field>
        <Field label="New password again" error={errors.confirm} required>
          <PasswordInput
            autoComplete="new-password"
            value={f.confirm}
            onChange={(e) => set("confirm")(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6">
        <Button type="submit" loading={saving}>
          {saving ? "Changing" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
