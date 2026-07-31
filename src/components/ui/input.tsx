"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-sm bg-surface-2 border border-border text-text placeholder:text-text-faint transition-colors duration-200 focus:border-brand-pink/70 focus:bg-surface disabled:opacity-60 disabled:cursor-not-allowed";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, rightSlot, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            fieldBase,
            "h-12 px-4 text-[0.95rem]",
            leftIcon && "pl-11",
            rightSlot && "pr-11",
            invalid &&
              "border-red-500/70 focus:border-red-500 bg-red-500/[0.04]",
            className
          )}
          {...props}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "min-h-28 resize-y px-4 py-3 text-[0.95rem] leading-relaxed",
        invalid && "border-red-500/70 focus:border-red-500 bg-red-500/[0.04]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/* ---------- Field wrapper: label + control + hint/error ---------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-sm font-medium text-text"
        >
          {label}
          {required && <span className="text-brand-pink">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
