import * as React from "react";
import { cn } from "@/lib/utils";

/** Max-width page container. */
export function Container({
  className,
  children,
  size = "default",
}: {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "narrow" | "wide";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-6 lg:px-8",
        size === "narrow" && "max-w-3xl",
        size === "default" && "max-w-6xl",
        size === "wide" && "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Elevated surface card. */
export function Card({
  className,
  children,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface p-5",
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small rounded tag/pill. */
export function Pill({
  className,
  children,
  active = false,
  as: As = "span",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  active?: boolean;
  as?: React.ElementType;
  // Rendering as a <button> is what makes a pill a filter or a toggle rather
  // than a label, and a button inside a form needs its type declaring or it
  // submits.
  type?: "button" | "submit" | "reset";
}) {
  return (
    <As
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
        active
          ? "border-transparent bg-grad-brand text-white shadow-glow-sm"
          : "border-border bg-surface-2 text-text-muted hover:border-border-strong hover:text-text-strong",
        className
      )}
      {...props}
    >
      {children}
    </As>
  );
}

/** Status/eyebrow label. */
export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "green" | "amber" | "cyan";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-3 text-text-muted border-border",
    brand: "bg-brand-pink/12 text-brand-pink border-brand-pink/25",
    green: "bg-accent-green/12 text-accent-green border-accent-green/25",
    amber: "bg-accent-gold/12 text-accent-gold border-accent-gold/25",
    cyan: "bg-accent-cyan/12 text-accent-cyan border-accent-cyan/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Section eyebrow (small uppercase gradient label). */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-gradient text-xs font-bold uppercase tracking-[0.2em]",
        className
      )}
    >
      {children}
    </span>
  );
}
