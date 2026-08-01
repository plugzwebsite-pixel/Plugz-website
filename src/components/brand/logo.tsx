import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string | null;
  className?: string;
  /** Font size of the wordmark. */
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

/**
 * The Pluggz wordmark: "Plugg" in the strong text colour, a gradient "z",
 * set in the Bodoni Moda display serif.
 */
export function Logo({ href = "/", className, size = "md" }: LogoProps) {
  const mark = (
    <span
      className={cn(
        "font-display font-semibold leading-none tracking-tight text-text-strong select-none",
        sizes[size],
        className
      )}
    >
      Plugg<span className="text-gradient italic">z</span>
    </span>
  );

  if (href === null) return mark;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Pluggz home">
      {mark}
    </Link>
  );
}
