"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, User, AtSign, PartyPopper } from "lucide-react";
import { waitlistSchema, type WaitlistInput } from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client/api";

const options = [
  { value: "CREATOR", label: "I'm a creator" },
  { value: "SHOPPER", label: "I'm a shopper" },
] as const;

export function WaitlistForm() {
  const [joined, setJoined] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof waitlistSchema>, unknown, WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { name: "", email: "", handle: "", interest: "CREATOR" },
  });

  const interest = watch("interest");

  async function onSubmit(values: WaitlistInput) {
    const res = await postJson("/api/waitlist", values);
    if (!res.ok) {
      setError("root", { message: res.message ?? "Something went wrong." });
      return;
    }
    setJoined(true);
  }

  if (joined) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-4 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-grad-brand">
          <PartyPopper className="text-white" size={26} />
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-text-strong">
          You&apos;re on the list
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-[0.95rem] text-text-muted">
          Thanks for joining. We&apos;ll be in touch the moment your spot opens up.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Segmented interest control */}
      <div className="grid grid-cols-2 gap-2 rounded-pill border border-border bg-surface-2/70 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setValue("interest", o.value)}
            className={cn(
              "relative rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
              interest === o.value
                ? "text-white"
                : "text-text-muted hover:text-text-strong"
            )}
          >
            {interest === o.value && (
              <motion.span
                layoutId="waitlist-pill"
                className="absolute inset-0 rounded-pill bg-grad-brand shadow-glow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        ))}
      </div>

      {errors.root && (
        <p className="text-sm text-red-400">{errors.root.message}</p>
      )}

      <Field htmlFor="wl-name" error={errors.name?.message}>
        <Input
          id="wl-name"
          placeholder="Full name"
          leftIcon={<User size={16} />}
          invalid={!!errors.name}
          {...register("name")}
        />
      </Field>
      <Field htmlFor="wl-email" error={errors.email?.message}>
        <Input
          id="wl-email"
          type="email"
          placeholder="Email address"
          leftIcon={<Mail size={16} />}
          invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Field htmlFor="wl-handle" error={errors.handle?.message}>
        <Input
          id="wl-handle"
          placeholder={
            interest === "CREATOR" ? "Main social handle (optional)" : "Handle (optional)"
          }
          leftIcon={<AtSign size={16} />}
          {...register("handle")}
        />
      </Field>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Join the waitlist
      </Button>
      <p className="text-center text-xs text-text-faint">
        No spam. We&apos;ll only email you about your Plugz access.
      </p>
    </form>
  );
}
