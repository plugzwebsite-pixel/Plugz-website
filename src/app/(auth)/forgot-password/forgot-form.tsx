"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Mail, MailCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    await postJson("/api/auth/forgot-password", values);
    setSentTo(values.email); // always show success — never reveal account existence
  }

  if (sentTo) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-md border border-border bg-surface-2/60 p-7 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-pink/12">
          <MailCheck className="text-brand-pink" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Check your email
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-text-muted">
          If an account exists for{" "}
          <span className="font-semibold text-text">{sentTo}</span>, a password
          reset link is on its way. The link expires in one hour.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
          <Link
            href="/dev/mailbox"
            className="text-xs text-text-faint transition-colors hover:text-brand-pink"
          >
            Dev: open the email inbox →
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leftIcon={<Mail size={16} />}
          invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
