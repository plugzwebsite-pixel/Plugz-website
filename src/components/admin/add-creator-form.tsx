"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, User, AtSign, MailCheck, AlertCircle } from "lucide-react";
import {
  adminAddCreatorSchema,
  type AdminAddCreatorInput,
  CATEGORIES,
} from "@/lib/validation";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/brand/social-icons";
import { postJson } from "@/lib/client/api";

const platforms = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "TikTok", icon: TikTokIcon },
  { label: "YouTube", icon: YouTubeIcon },
] as const;

export function AddCreatorForm({ categories }: { categories?: string[] }) {
  const choices = categories?.length ? categories : [...CATEGORIES];
  const [invited, setInvited] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof adminAddCreatorSchema>, unknown, AdminAddCreatorInput>({
    resolver: zodResolver(adminAddCreatorSchema),
    defaultValues: {
      name: "",
      email: "",
      handle: "",
      category: undefined,
      city: "",
      socials: [
        { platform: "instagram", handle: "", followers: 0 },
        { platform: "tiktok", handle: "", followers: 0 },
        { platform: "youtube", handle: "", followers: 0 },
      ],
    },
  });

  async function onSubmit(values: AdminAddCreatorInput) {
    const res = await postJson("/api/admin/creators", values);
    if (!res.ok) {
      if (res.errors) {
        for (const [f, m] of Object.entries(res.errors))
          setError(f as keyof z.input<typeof adminAddCreatorSchema>, { message: m });
      } else {
        setError("root", { message: res.message ?? "Something went wrong." });
      }
      return;
    }
    setInvited(values.email);
    reset();
  }

  if (invited) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-md border border-accent-green/25 bg-accent-green/[0.06] p-7 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-green/15">
          <MailCheck className="text-accent-green" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Invite sent
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[0.95rem] text-text-muted">
          An invite is on its way to{" "}
          <span className="font-semibold text-text">{invited}</span>. Their profile
          stays hidden until they set a password and release it.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => setInvited(null)}>
          Add another
        </Button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-md border border-border bg-surface p-6"
      noValidate
    >
      {errors.root && (
        <div className="flex items-start gap-2.5 rounded-sm border border-red-500/30 bg-red-500/[0.06] p-3.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.root.message}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" required error={errors.name?.message}>
          <Input id="c-name" placeholder="Rachel Ellis" leftIcon={<User size={16} />} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="c-email" required error={errors.email?.message}>
          <Input id="c-email" type="email" placeholder="rachel@example.com" leftIcon={<Mail size={16} />} {...register("email")} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Handle" htmlFor="c-handle" required error={errors.handle?.message}>
          <Input id="c-handle" placeholder="rachelellis" leftIcon={<AtSign size={16} />} {...register("handle")} />
        </Field>
        <Field label="Category" htmlFor="c-category" required error={errors.category?.message}>
          <Select id="c-category" defaultValue="" {...register("category")}>
            <option value="" disabled>
              Choose a category
            </option>
            {choices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="City" htmlFor="c-city" hint="Optional">
        <Input id="c-city" placeholder="London" {...register("city")} />
      </Field>

      <div>
        <label className="text-sm font-medium text-text">Platforms</label>
        <div className="mt-3 space-y-3">
          {platforms.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="grid grid-cols-[1.4fr_1fr] gap-2.5">
                <Input placeholder={`${p.label} handle`} leftIcon={<Icon size={16} />} {...register(`socials.${i}.handle` as const)} />
                <Input placeholder="Followers" type="number" min={0} {...register(`socials.${i}.followers` as const)} />
              </div>
            );
          })}
        </div>
        {errors.socials && (
          <p className="mt-2 text-sm text-red-400">
            {errors.socials.message ?? "Add at least one platform handle"}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Send invite
        </Button>
      </div>
    </form>
  );
}
