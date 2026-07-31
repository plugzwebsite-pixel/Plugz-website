"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "group flex cursor-pointer items-start gap-3 text-sm text-text-muted",
          className
        )}
      >
        <span className="relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <span className="h-5 w-5 rounded-[6px] border border-border-strong bg-surface-2 transition-colors peer-checked:border-transparent peer-checked:bg-grad-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-pink" />
          <Check
            size={13}
            strokeWidth={3.5}
            className="pointer-events-none absolute scale-0 text-white opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100"
          />
        </span>
        {label && <span className="leading-relaxed">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-12 w-full appearance-none rounded-sm border border-border bg-surface-2 px-4 pr-10 text-[0.95rem] text-text transition-colors focus:border-brand-pink/70 focus:bg-surface",
          invalid && "border-red-500/70 focus:border-red-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint"
      />
    </div>
  )
);
Select.displayName = "Select";
