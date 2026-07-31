import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure link to set a new password."
    >
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-pink hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
