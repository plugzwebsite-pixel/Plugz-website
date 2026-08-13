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
      {/* As bare text this is a 20px tap target, well under what a thumb can
          reliably hit. The overlay grows the hit area to 44px without touching
          the layout, so the link still sits on the heading's baseline. */}
      {action && (
        <Link
          href={action.href}
          className="group relative inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:underline"
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
