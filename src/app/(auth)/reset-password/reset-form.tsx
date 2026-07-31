"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ShieldX } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { resetPasswordSchema } from "@/lib/validation";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

const formSchema = resetPasswordSchema
  .extend({ confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const token = params.get("token") ?? "";
  const isInvite = params.get("invite") === "1";
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { token, password: "", confirm: "" },
  });

  async function onSubmit(values: FormValues) {
    const res = await postJson("/api/auth/reset-password", {
      token,
      password: values.password,
    });
    if (!res.ok) {
      setError("root", { message: res.message ?? "Could not reset password." });
      return;
    }
    setDone(true);
    toast.success(
      isInvite ? "Profile released" : "Password updated",
      "You can now sign in."
    );
    setTimeout(() => router.push("/login"), 1400);
  }

  if (!token) {
    return (
      <div className="rounded-md border border-red-500/25 bg-red-500/[0.06] p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/12">
          <ShieldX className="text-red-400" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Invalid link
        </h2>
        <p className="mt-3 text-[0.95rem] text-text-muted">
          This reset link is missing or malformed. Request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block">
          <Button variant="secondary">Request a new link</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <AnimatePresence>
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 rounded-sm border border-red-500/30 bg-red-500/[0.06] p-3.5 text-sm text-red-400"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errors.root.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isInvite && (
        <p className="rounded-sm border border-brand-pink/20 bg-brand-pink/[0.06] p-3.5 text-sm text-text-muted">
          Set your password to release your profile and take your storefront live.
        </p>
      )}

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="New password"
          invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          placeholder="Re-enter password"
          invalid={!!errors.confirm}
          {...register("confirm")}
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        disabled={done}
        className="w-full"
      >
        {isInvite ? "Set password & release profile" : "Update password"}
      </Button>
    </form>
  );
}
