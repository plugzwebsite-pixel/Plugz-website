import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { CreatorSignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Apply to become a creator",
  description:
    "Apply to join Plugz — turn the products you already recommend into commission.",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Creator application"
      title="Apply to become a creator"
      subtitle="Tell us where you post and what you plug. Applications are reviewed by the Plugz team, usually within a couple of days."
    >
      <CreatorSignupForm />
      <p className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-pink hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
