import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { CreatorCardData } from "@/lib/queries";
import { cn, shortName } from "@/lib/utils";

type Creator = CreatorCardData;

/** An 80px avatar plus its horizontal padding and the flex gap either side. */
const FACE_WIDTH_PX = 128;
/** Comfortably past a 1728px laptop, so a row never runs dry mid-screen. */
const MIN_TRACK_WIDTH_PX = 1900;

function Face({ creator }: { creator: Creator }) {
  return (
    <Link
      href={`/@${creator.handle}`}
      className="group/face flex shrink-0 flex-col items-center gap-2 px-5"
      aria-label={`${creator.name} storefront`}
    >
      <span className="transition-transform duration-300 group-hover/face:-translate-y-1 group-hover/face:scale-105">
        <Avatar name={creator.name} src={creator.avatarUrl ?? undefined} size="xl" ring />
      </span>
      <span className="max-w-[7rem] truncate text-sm font-medium text-text-strong">
        {shortName(creator.name)}
      </span>
    </Link>
  );
}

/**
 * Builds the strip a row scrolls through.
 *
 * The animation slides the track left by exactly half its width, so the back
 * half has to be a pixel-perfect copy of the front half or the loop visibly
 * jumps. The front half also has to be wider than the screen, otherwise the row
 * runs out of faces part-way across and drifts as a gap. Six creators only
 * covered 644px of a 1440px page, so a third of the hero was empty on every
 * pass.
 *
 * The list is laid down unchanged each time rather than shuffled between
 * passes. That keeps the sequence's period equal to the number of creators, and
 * any run of that many consecutive faces is then the full cast exactly once,
 * so nobody appears twice on screen while there are more creators than fit
 * across it. Rotating the passes lengthens the period and puts duplicates back
 * in view, which is worth remembering before trying to improve this.
 */
function buildTrack(creators: Creator[]) {
  const copies = Math.max(
    1,
    Math.ceil(MIN_TRACK_WIDTH_PX / (creators.length * FACE_WIDTH_PX))
  );
  const half = Array.from({ length: copies }, () => creators).flat();
  return [...half, ...half];
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
  return (
    <div
      className="flex w-max animate-marquee gap-2 hover:[animation-play-state:paused] motion-reduce:animate-none"
      style={{
        animationDirection: reverse ? "reverse" : "normal",
        animationDuration: `${duration}s`,
      }}
    >
      {buildTrack(creators).map((c, i) => (
        <Face key={`${c.handle}-${i}`} creator={c} />
      ))}
    </div>
  );
}

/**
 * Cameo-style wall of creators: two rows of circular portraits drifting in
 * opposite directions, pausing on hover. This is the homepage's opening hook.
 *
 * Both rows carry every creator rather than half each. Splitting the list gave
 * each row too few faces to fill the screen, and the leftover from an odd split
 * put the same two people in both rows at once.
 */
export function CreatorCarousel({
  creators,
  className,
}: {
  creators: Creator[];
  className?: string;
}) {
  if (creators.length === 0) return null;

  // The lower row starts half-way round the list so the two never sit in step.
  const offset = Math.floor(creators.length / 2);
  const lower = [...creators.slice(offset), ...creators.slice(0, offset)];

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
        <Row creators={creators} duration={46} />
        <Row creators={lower} reverse duration={52} />
      </div>
    </div>
  );
}
