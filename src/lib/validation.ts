import { z } from "zod";

export const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

export const CATEGORIES = [
  "Women's Fashion",
  "Beauty & Skincare",
  "Shoes & Accessories",
  "Home",
  "Fitness & Lifestyle",
  "Travel / Holiday",
] as const;

const email = z.email({ message: "Enter a valid email address" });

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Include at least one letter and one number",
  });

const handle = z
  .string()
  .trim()
  .min(2, "Handle is too short")
  .max(30, "Handle is too long")
  .regex(/^[a-zA-Z0-9._]+$/, "Letters, numbers, dots and underscores only")
  .transform((v) => v.replace(/^@/, "").toLowerCase());

const social = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().trim().max(60).optional().or(z.literal("")),
  followers: z.coerce.number().int().min(0).max(100_000_000).default(0),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const creatorSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email,
    password,
    handle,
    // No creator-level category — categorisation happens per product at upload.
    city: z.string().trim().max(80).optional().or(z.literal("")),
    socials: z.array(social).min(1),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "You must accept the Creator Terms to apply"),
  })
  .refine(
    (d) => d.socials.some((s) => s.handle && s.handle.trim().length > 0),
    { message: "Add at least one platform handle", path: ["socials"] }
  );
export type CreatorSignupInput = z.infer<typeof creatorSignupSchema>;

export const waitlistSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  handle: z.string().trim().max(60).optional().or(z.literal("")),
  interest: z.enum(["CREATOR", "SHOPPER"]).default("CREATOR"),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset link"),
  password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const adminAddCreatorSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email,
  handle,
  category: z.enum(CATEGORIES, { message: "Choose a category" }),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  socials: z.array(social).min(1),
});
export type AdminAddCreatorInput = z.infer<typeof adminAddCreatorSchema>;

/** Flatten a ZodError into a { field: message } map for form display. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
