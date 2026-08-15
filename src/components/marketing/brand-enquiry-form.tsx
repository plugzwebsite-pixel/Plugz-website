"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Building2, Globe, User, Mail, CheckCircle2, Network, Ticket } from "lucide-react";
import { z } from "zod";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brandEnquirySchema, type BrandEnquiryInput } from "@/lib/validation";
import { postJson } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export function BrandEnquiryForm() {
  const [sent, setSent] = useState(false);
  const [hasProgramme, setHasProgramme] = useState<boolean | null>(null);

  // Three generics because `hasAffiliateProgramme` has a schema default: the
  // input type treats it as optional, the parsed output does not.
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof brandEnquirySchema>, unknown, BrandEnquiryInput>({
    resolver: zodResolver(brandEnquirySchema),
    defaultValues: { hasAffiliateProgramme: false },
  });

  async function onSubmit(values: BrandEnquiryInput) {
    const res = await postJson("/api/brands/enquiry", values);
    if (!res.ok) {
      if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          setError(field as keyof BrandEnquiryInput, { message });
        }
      } else {
        setError("brand", { message: res.message });
      }
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border border-accent-green/25 bg-accent-green/[0.06] p-10 text-center"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-green/15">
          <CheckCircle2 className="text-accent-green" size={28} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
          Thanks, we&apos;ll be in touch
        </h2>
        <p className="mx-auto mt-3 max-w-md text-text-muted">
          Someone from the Pluggz team will come back to you shortly to talk
          through commission, tracking and how your products would work on the
          platform.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-lg border border-border bg-surface p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand name" htmlFor="brand" error={errors.brand?.message} required>
          <Input
            id="brand"
            placeholder="Your brand"
            leftIcon={<Building2 size={16} />}
            {...register("brand")}
          />
        </Field>
        <Field label="Website" htmlFor="website" error={errors.website?.message}>
          <Input
            id="website"
            placeholder="aurarituals.co.uk"
            leftIcon={<Globe size={16} />}
            {...register("website")}
          />
        </Field>
        <Field label="Your name" htmlFor="contactName" error={errors.contactName?.message} required>
          <Input
            id="contactName"
            placeholder="Helen Ward"
            leftIcon={<User size={16} />}
            {...register("contactName")}
          />
        </Field>
        <Field label="Your email" htmlFor="contactEmail" error={errors.contactEmail?.message} required>
          <Input
            id="contactEmail"
            type="email"
            placeholder="helen@aurarituals.co.uk"
            leftIcon={<Mail size={16} />}
            {...register("contactEmail")}
          />
        </Field>
      </div>

      <Field label="Your role" htmlFor="contactRole" error={errors.contactRole?.message} hint="Optional">
        <Input id="contactRole" placeholder="Marketing Manager" {...register("contactRole")} />
      </Field>

      {/* The question that decides which onboarding path this brand is on. */}
      <div>
        <p className="text-sm font-medium text-text">
          Do you already run an affiliate or referral programme?
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Either way works. It just changes how we set up tracking.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Choice
            active={hasProgramme === true}
            onClick={() => {
              setHasProgramme(true);
              setValue("hasAffiliateProgramme", true);
            }}
            icon={<Network size={18} />}
            title="Yes, we do"
            desc="Awin, Impact, ShareASale, a Shopify app…"
          />
          <Choice
            active={hasProgramme === false}
            onClick={() => {
              setHasProgramme(false);
              setValue("hasAffiliateProgramme", false);
            }}
            icon={<Ticket size={18} />}
            title="No, not yet"
            desc="We'd set up a direct partnership"
          />
        </div>
      </div>

      {hasProgramme === true && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Field label="Which platform?" htmlFor="networkName" error={errors.networkName?.message}>
            <Input id="networkName" placeholder="Awin, Impact, UpPromote…" {...register("networkName")} />
          </Field>
        </motion.div>
      )}

      <Field label="What do you sell?" htmlFor="categories" error={errors.categories?.message}>
        <Input
          id="categories"
          placeholder="Skincare, beauty"
          {...register("categories")}
        />
      </Field>

      <Field label="Anything else?" htmlFor="message" hint="Optional" error={errors.message?.message}>
        <Textarea
          id="message"
          rows={3}
          placeholder="Tell us a bit about the brand, or what you're hoping to achieve…"
          {...register("message")}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Send enquiry
      </Button>
      <p className="text-center text-xs text-text-faint">
        No commitment. We&apos;ll come back to you with how it would work and
        what the commission looks like.
      </p>
    </form>
  );
}

function Choice({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-md border p-4 text-left transition-colors",
        active
          ? "border-brand-pink/60 bg-brand-pink/[0.06]"
          : "border-border bg-surface-2/40 hover:border-border-strong"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md",
          active ? "bg-grad-brand text-white" : "bg-surface-3 text-text-muted"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-text-strong">{title}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{desc}</span>
      </span>
    </button>
  );
}
