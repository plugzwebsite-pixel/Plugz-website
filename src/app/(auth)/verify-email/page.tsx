import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmail } from "./verify-client";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <AuthShell eyebrow="Almost there" title="Email verification">
      <Suspense fallback={null}>
        <VerifyEmail />
      </Suspense>
    </AuthShell>
  );
}
