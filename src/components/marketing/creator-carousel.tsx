import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { CreatorCardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Creator = CreatorCardData;

function Face({ creator }: { creator: Creator }) {
  return (
    <Link
      href={`/@${creator.handle}`}
      className="group/face flex shrink-0 flex-col items-center gap-2 px-2.5"
      aria-label={`${creator.name} storefront`}
    >
      <span className="transition-transform duration-300 group-hover/face:-translate-y-1 group-hover/face:scale-105">
        <Avatar name={creator.name} src={creator.avatarUrl ?? undefined} size="xl" ring />
      </span>
      <span className="text-sm font-medium text-text-strong">
        {creator.name.split(" ")[0]}
      </span>
    </Link>
  );
}

function Row({
  creators,
  reverse = false,
  duration = 42,
}: {
  creators: Creator[];
  reverse?: boolean;
  duration?: number;
}) {
  const doubled = [...creators, ...creators];
  return (
    <div
      className="flex w-max animate-marquee gap-2 hover:[animation-play-state:paused]"
      style={{
        animationDirection: reverse ? "reverse" : "normal",
        animationDuration: `${duration}s`,
      }}
    >
      {doubled.map((c, i) => (
        <Face key={`${c.handle}-${i}`} creator={c} />
      ))}
    </div>
  );
}

/**
 * Cameo-style wall of creators: two rows of circular portraits drifting in
 * opposite directions, pausing on hover. This is the homepage's opening hook.
 */
export function CreatorCarousel({
  creators,
  className,
}: {
  creators: Creator[];
  className?: string;
}) {
  if (creators.length === 0) return null;

  const half = Math.max(1, Math.ceil(creators.length / 2));
  const rowA = creators.slice(0, half);
  const rowB = [...creators.slice(half), ...creators.slice(0, 2)];

  return (
    <div className={cn("relative overflow-hidden py-2", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent sm:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent sm:w-28"
      />
      <div className="space-y-4">
        <Row creators={rowA} duration={46} />
        <Row creators={rowB} reverse duration={52} />
      </div>
    </div>
  );
}
