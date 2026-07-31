import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/ui/reveal";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "Be first on Plugz — register your interest as a creator or shopper.",
};

export default function WaitlistPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <Aurora intensity="medium" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--hero-veil)" }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-strong"
        >
          <ArrowLeft size={16} /> Back to Plugz
        </Link>
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-2/70 px-4 py-1.5 text-xs font-medium text-text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent-green" />
              Launching in the UK · 62 creators and counting
            </span>
          </Reveal>
          <Reveal index={1}>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-[1.03] text-text-strong">
              Be first on{" "}
              <span className="text-gradient italic">Plugz.</span>
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-text-muted">
              Register your interest now. Creators get priority onboarding;
              shoppers get first access to the curated edit.
            </p>
          </Reveal>
          <Reveal index={3}>
            <div className="glass mx-auto mt-9 rounded-lg border border-border-strong p-6 text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] sm:p-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-sm text-text-faint">
        © 2026 Plugz Ltd · Discover here, buy at the brand.
      </footer>
    </div>
  );
}
