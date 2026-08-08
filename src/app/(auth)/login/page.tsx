import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Pluggz — creators, brands and the Pluggz team.",
};

// One sign-in serves all three roles and the platform routes you from there.
// Naming only creators and admins left brand contacts unsure they were in the
// right place.
export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Pluggz"
      subtitle="Creators, brands and the Pluggz team all sign in here."
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
