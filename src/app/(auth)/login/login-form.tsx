"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    const res = await postJson<{ redirect: string; role: string }>(
      "/api/auth/login",
      values
    );

    if (!res.ok) {
      if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          setError(field as keyof LoginInput, { message });
        }
      }
      setError("root", {
        message: res.message ?? "Something went wrong. Please try again.",
      });
      return;
    }

    toast.success("Signed in", "Welcome back to Pluggz.");
    const dest = next && next.startsWith("/") ? next : res.data!.redirect;
    router.push(dest);
    router.refresh();
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

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Your password"
          invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-text-muted transition-colors hover:text-brand-pink"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
