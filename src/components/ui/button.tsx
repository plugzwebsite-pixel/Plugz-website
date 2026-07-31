"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold rounded-pill whitespace-nowrap select-none transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out-quart disabled:opacity-55 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-grad-brand shadow-glow hover:shadow-[0_16px_40px_-12px_rgba(196,59,255,0.85)] hover:-translate-y-0.5",
  secondary:
    "text-text-strong bg-surface-3 border border-border-strong hover:bg-surface-2 hover:-translate-y-0.5",
  outline:
    "text-text-strong border border-border-strong bg-transparent hover:bg-surface-2/60 hover:-translate-y-0.5",
  ghost: "text-text-muted hover:text-text-strong hover:bg-surface-2/70",
  danger:
    "text-white bg-[linear-gradient(120deg,#ff2d5b,#ff5b2d)] shadow-[0_12px_34px_-12px_rgba(255,45,91,0.7)] hover:-translate-y-0.5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-[54px] px-8 text-base",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
