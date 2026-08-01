import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/ui/reveal";

const stats = [
  { value: "£2.4M", label: "shopped this month" },
  { value: "62", label: "UK creators live" },
  { value: "8%", label: "creator commission" },
];

/** Split-screen auth layout: a branded panel + the form. */
export function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-bg-elev lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Aurora intensity="strong" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "var(--hero-veil)" }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <Logo size="lg" />
        </div>

        <div className="relative z-10 max-w-md">
          <Reveal>
            <h2 className="font-display text-[2.7rem] font-semibold leading-[1.05] text-text-strong">
              Your taste is worth{" "}
              <span className="text-gradient italic">commission.</span>
            </h2>
          </Reveal>
          <Reveal index={1}>
            <p className="mt-5 text-lg leading-relaxed text-text-muted">
              The UK&apos;s curated directory of creators and the products they
              actually plug. Turn recommendations into income — we handle the
              links, tracking and payouts.
            </p>
          </Reveal>
          <Reveal index={2}>
            <div className="mt-10 flex gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl font-semibold text-text-strong">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-text-faint">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <p className="relative z-10 text-sm text-text-faint">
          © 2026 Pluggz Ltd · Discover here, buy at the brand.
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-bg">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-strong"
          >
            <ArrowLeft size={16} /> Back to Pluggz
          </Link>
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <Reveal>
              {eyebrow && (
                <p className="text-gradient mb-3 text-xs font-bold uppercase tracking-[0.2em]">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-display text-4xl font-semibold text-text-strong">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-[0.975rem] leading-relaxed text-text-muted">
                  {subtitle}
                </p>
              )}
            </Reveal>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
