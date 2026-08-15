"use client";

import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import {
  shopperProfileSchema,
  CATEGORIES,
  type ShopperProfileInput,
} from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/controls";
import { Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { patchJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

type Category = (typeof CATEGORIES)[number];

export function AccountForm({
  defaults,
}: {
  defaults: { name: string; city: string; interests: string[]; marketing: boolean };
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.input<typeof shopperProfileSchema>, unknown, ShopperProfileInput>({
    resolver: zodResolver(shopperProfileSchema),
    defaultValues: {
      name: defaults.name,
      city: defaults.city,
      // Anything no longer offered as a category is dropped rather than kept
      // as a value the form can't display or clear.
      interests: defaults.interests.filter((i): i is Category =>
        (CATEGORIES as readonly string[]).includes(i)
      ),
      marketing: defaults.marketing,
    },
  });

  // Controlled through the form rather than setValue. See the note on the
  // sign-up form: setValue on a field with no input behind it updates the value
  // without re-rendering, so the pills would never light up.
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
    setSaved(false);
  }

  async function onSubmit(values: ShopperProfileInput) {
    const res = await patchJson("/api/account", values);

    if (!res.ok) {
      if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          setError(field as keyof z.input<typeof shopperProfileSchema>, {
            message,
          });
        }
      } else {
        setError("root", { message: res.message ?? "Something went wrong." });
      }
      return;
    }

    // Re-baseline the form so it stops reporting unsaved changes.
    reset(values);
    setSaved(true);
    toast.success("Saved", "Your details have been updated.");
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            invalid={!!errors.name}
            {...register("name")}
          />
        </Field>
        <Field label="City" htmlFor="city" hint="Optional" error={errors.city?.message}>
          <Input id="city" placeholder="London" {...register("city")} />
        </Field>
      </div>

      <div>
        <span className="text-sm font-medium text-text">
          What you&apos;re shopping for
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
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
      </div>

      <div className="rounded-sm border border-border bg-surface-2/60 p-4">
        <Checkbox
          {...register("marketing")}
          label="Email me new creators, edits and drops from Pluggz."
        />
        <p className="mt-2 pl-8 text-sm text-text-faint">
          Untick this and we stop sending straight away. It has no effect on
          your account.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
        {saved && !isDirty && (
          <span className="inline-flex items-center gap-1.5 text-sm text-accent-green">
            <Check size={15} /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
