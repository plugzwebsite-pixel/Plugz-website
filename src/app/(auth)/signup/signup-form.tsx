"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, AtSign, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";
import {
  creatorSignupSchema,
  type CreatorSignupInput,
} from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";
import { SignupPhotoPicker } from "./signup-photo-picker";

const platforms = [
  { key: "instagram", label: "Instagram", icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", icon: TikTokIcon },
  { key: "youtube", label: "YouTube", icon: YouTubeIcon },
] as const;

/**
 * Post the application with the portrait attached, in one request.
 *
 * The fields still travel as JSON in a `payload` part, so the server validates
 * exactly the same shape whether or not a photo came with it.
 */
async function postSignupWithPhoto(values: CreatorSignupInput, photo: File) {
  const body = new FormData();
  body.append("payload", JSON.stringify(values));
  body.append("photo", photo);

  const res = await fetch("/api/auth/signup", { method: "POST", body });
  const json = (await res.json().catch(() => null)) as {
    message?: string;
    errors?: Record<string, string>;
  } | null;

  return res.ok
    ? { ok: true as const, message: undefined, errors: undefined }
    : {
        ok: false as const,
        message: json?.message ?? "Something went wrong.",
        errors: json?.errors,
      };
}

export function CreatorSignupForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof creatorSignupSchema>, unknown, CreatorSignupInput>({
    resolver: zodResolver(creatorSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      handle: "",
      city: "",
      acceptTerms: false,
      socials: [
        { platform: "instagram", handle: "", followers: 0 },
        { platform: "tiktok", handle: "", followers: 0 },
        { platform: "youtube", handle: "", followers: 0 },
      ],
    },
  });

  const handle = watch("handle");

  async function onSubmit(values: CreatorSignupInput) {
    // Multipart only when there is a file to carry, so the ordinary path stays
    // a plain JSON post.
    const res = photo
      ? await postSignupWithPhoto(values, photo)
      : await postJson<{ email: string }>("/api/auth/signup", values);
    if (!res.ok) {
      if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          setError(field as keyof z.input<typeof creatorSignupSchema>, { message });
        }
      }
      if (!res.errors) {
        setError("root", { message: res.message ?? "Something went wrong." });
      }
      return;
    }
    setSubmitted(values.email);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="rounded-md border border-accent-green/25 bg-accent-green/[0.06] p-7 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-green/15">
          <CheckCircle2 className="text-accent-green" size={30} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Application submitted
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-text-muted">
          Thanks — your application is now{" "}
          <span className="font-semibold text-text">pending review</span>. We&apos;ve
          sent a verification link to{" "}
          <span className="font-semibold text-text">{submitted}</span>. Verify
          your email while our team checks your profile.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Go to sign in
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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

      <SignupPhotoPicker onChange={setPhoto} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Freya Sinclair"
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
      </div>

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

      <Field
        label="Storefront handle"
        htmlFor="handle"
        required
        error={errors.handle?.message}
        hint={
          handle
            ? undefined
            : "Tip: use your Instagram handle. Most shoppers find you there, so it keeps your storefront link consistent and easy to recognise."
        }
      >
        <Input
          id="handle"
          placeholder="freyasinclair"
          leftIcon={<AtSign size={16} />}
          invalid={!!errors.handle}
          {...register("handle")}
        />
        {handle && !errors.handle && (
          <p className="mt-1.5 text-sm text-text-faint">
            pluggz.com/
            <span className="font-semibold text-text">
              @{handle.replace(/^@/, "").toLowerCase()}
            </span>
          </p>
        )}
      </Field>

      <Field label="City" htmlFor="city" hint="Optional" error={errors.city?.message}>
        <Input id="city" placeholder="London" {...register("city")} />
      </Field>

      {/* Platforms */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-sm font-medium text-text">
            Where do you post? <span className="text-brand-pink">*</span>
          </label>
          <span className="text-xs text-text-faint">Add at least one</span>
        </div>
        <div className="space-y-3">
          {platforms.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className="grid grid-cols-[1fr_auto] gap-2.5 sm:grid-cols-[1.4fr_1fr]"
              >
                <Input
                  aria-label={`${p.label} handle`}
                  placeholder={`${p.label} handle`}
                  leftIcon={<Icon size={16} />}
                  {...register(`socials.${i}.handle` as const)}
                />
                <Input
                  aria-label={`${p.label} followers`}
                  type="number"
                  min={0}
                  placeholder="Followers"
                  {...register(`socials.${i}.followers` as const)}
                />
              </div>
            );
          })}
        </div>
        {errors.socials && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {errors.socials.message ?? "Add at least one platform handle"}
          </p>
        )}
      </div>

      <div className="rounded-sm border border-border bg-surface-2/60 p-4">
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
                Pluggz Creator Terms &amp; Membership Agreement
              </Link>
              . I understand my acceptance is recorded and timestamped.
            </>
          }
        />
        {errors.acceptTerms && (
          <p className="mt-2 pl-8 text-sm text-red-400" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Submit application
      </Button>
    </form>
  );
}
