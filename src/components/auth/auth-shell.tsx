import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Aurora } from "@/components/marketing/aurora";
import { Reveal } from "@/components/ui/reveal";
import { Avatar } from "@/components/ui/avatar";
import { getFeaturedCreators, getPlatformStats } from "@/lib/queries";

/**
 * Split-screen auth layout: a branded panel and the form.
 *
 * The panel speaks to whoever the form is for. Telling a shopper their taste
 * is worth commission promises them something the account does not give them.
 */
export async function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
  audience = "creator",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  audience?: "creator" | "shopper";
}) {
  // Counted live. This panel is what a creator reads while deciding whether to
  // apply, so it can't carry numbers the platform hasn't actually done. The
  // commission floor is the one fixed figure: it's contractual, not a metric.
  // Faces, not decoration. Somebody weighing up an application wants to know
  // who else is here, and these are the real roster with their own photographs.
  const [platform, creators] = await Promise.all([
    getPlatformStats(),
    getFeaturedCreators(12),
  ]);
  const faces = creators.filter((c) => c.avatarUrl).slice(0, 6);
  const beyond = platform.creators - faces.length;

  const stats =
    audience === "shopper"
      ? [
          { value: String(platform.creators), label: "UK creators" },
          { value: String(platform.listings), label: "products plugged" },
          { value: String(platform.brands), label: "brands" },
        ]
      : [
          { value: String(platform.creators), label: "UK creators live" },
          { value: String(platform.listings), label: "products plugged" },
          { value: "8%", label: "creator commission" },
        ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      {/* Pinned to the viewport. The form beside it runs well past one screen
          on the creator application, and a panel that grows with it pushed its
          own content far below the fold, leaving a screenful of empty gradient
          as the first thing anybody saw. */}
      <aside className="relative hidden overflow-hidden bg-bg-elev lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:self-start lg:p-12">
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
              {audience === "shopper" ? (
                <>
                  Shop what they{" "}
                  <span className="text-gradient italic">actually</span> plug.
                </>
              ) : (
                <>
                  Your taste is worth{" "}
                  <span className="text-gradient italic">commission.</span>
                </>
              )}
            </h2>
          </Reveal>
          <Reveal index={1}>
            <p className="mt-5 text-lg leading-relaxed text-text-muted">
              {audience === "shopper"
                ? "Every product here is on a creator's storefront because they put it there. Follow the ones whose taste you trust and hear what they are plugging first."
                : "The UK's curated directory of creators and the products they actually plug. Turn recommendations into income, and we handle the links, tracking and payouts."}
            </p>
          </Reveal>
          {faces.length > 0 && (
            <Reveal index={2}>
              <div className="mt-9 flex items-center gap-3.5">
                <div className="flex -space-x-3">
                  {faces.map((c) => (
                    <Avatar
                      key={c.handle}
                      name={c.name}
                      src={c.avatarUrl ?? undefined}
                      size="sm"
                      className="ring-2 ring-bg-elev"
                    />
                  ))}
                </div>
                <p className="text-sm text-text-muted">
                  {beyond > 0
                    ? `and ${beyond} more already have a storefront`
                    : "already have a storefront"}
                </p>
              </div>
            </Reveal>
          )}

          <Reveal index={3}>
            <div className="mt-9 flex gap-8">
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
