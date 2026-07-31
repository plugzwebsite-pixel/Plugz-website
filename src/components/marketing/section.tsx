import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/primitives";

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 font-display text-3xl font-semibold text-text-strong sm:text-4xl">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink hover:underline"
        >
          {action.label}
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
