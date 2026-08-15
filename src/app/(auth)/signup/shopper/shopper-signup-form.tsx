"use client";

import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, User, AlertCircle } from "lucide-react";
import {
  shopperSignupSchema,
  CATEGORIES,
  type ShopperSignupInput,
} from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/controls";
import { Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";
import { hardNavigate } from "@/lib/auth/navigate";

type Category = (typeof CATEGORIES)[number];

/**
 * `source` is read from the query string by the page and handed down, rather
 * than pulled from useSearchParams here. Reading it on the client would put
 * this whole form behind a Suspense boundary for the sake of one optional
 * string, and the server already has the value.
 */
export function ShopperSignupForm({ source }: { source?: string }) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof shopperSignupSchema>, unknown, ShopperSignupInput>({
    resolver: zodResolver(shopperSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      city: "",
      interests: [],
      marketing: false,
      acceptTerms: false,
    },
  });

  // The category pills aren't inputs, so they go through a controller rather
  // than setValue. An unregistered field updated with setValue changes the
  // form's value without re-rendering, which leaves the pills looking untouched
  // while the submission quietly carries the selection.
  const { field: interestsField } = useController({
    control,
    name: "interests",
  });
  const interests = (interestsField.value ?? []) as Category[];

  function toggleInterest(category: Category) {
    interestsField.onChange(
      interests.includes(category)
        ? interests.filter((c) => c !== category)
        : [...interests, category]
    );
  }

  async function onSubmit(values: ShopperSignupInput) {
    const res = await postJson<{ redirect: string }>(
      "/api/auth/signup/shopper",
      { ...values, source }
    );

    if (!res.ok) {
      if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          setError(field as keyof z.input<typeof shopperSignupSchema>, {
            message,
          });
        }
      } else {
        setError("root", { message: res.message ?? "Something went wrong." });
      }
      return;
    }

    // Sign-up issues the session, so this is an auth transition: full load, or
    // the Router Cache can serve pages rendered for nobody.
    hardNavigate(res.data?.redirect ?? "/account");
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

      <Field label="Full name" htmlFor="name" required error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Alex Morgan"
          leftIcon={<User size={16} />}
          invalid={!!errors.name}
          {...register("name")}
        />
      </Field>

      <Field label="Email" htmlFor="email" required error={errors.email?.message}>
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

      <Field
        label="Password"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Create a password"
          invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Field label="City" htmlFor="city" hint="Optional" error={errors.city?.message}>
        <Input id="city" placeholder="London" {...register("city")} />
      </Field>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium text-text">
            What are you shopping for?
          </span>
          <span className="text-xs text-text-faint">Optional</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Pill
              key={category}
              as="button"
              type="button"
              active={interests.includes(category)}
              aria-pressed={interests.includes(category)}
              onClick={() => toggleInterest(category)}
            >
              {category}
            </Pill>
          ))}
        </div>
        <p className="mt-2.5 text-sm text-text-faint">
          We use this to keep what we send you relevant. You can change it any
          time.
        </p>
      </div>

      <div className="space-y-3 rounded-sm border border-border bg-surface-2/60 p-4">
        <Checkbox
          {...register("marketing")}
          label="Email me new creators, edits and drops from Pluggz. I can unsubscribe whenever I like."
        />
        <div className="h-px bg-border" />
        <Checkbox
          {...register("acceptTerms")}
          label={
            <>
              I accept the{" "}
              <Link
                href="/legal/creator-terms"
                target="_blank"
                className="font-medium text-brand-pink hover:underline"
              >
                Pluggz terms
              </Link>
              . I understand my acceptance is recorded and timestamped.
            </>
          }
        />
        {errors.acceptTerms && (
          <p className="pl-8 text-sm text-red-400" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Create my account
      </Button>
    </form>
  );
}
