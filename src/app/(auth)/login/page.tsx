import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Plugz creator or admin account.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Plugz"
      subtitle="Access your creator dashboard or the admin console."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-text-muted">
        New creator?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-pink hover:underline"
        >
          Apply to join
        </Link>
      </p>
    </AuthShell>
  );
}
