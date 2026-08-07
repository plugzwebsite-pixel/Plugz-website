import { SmartImage } from "@/components/ui/smart-image";
import { cn, initials } from "@/lib/utils";

/** Multicolour gradient palettes matching the demo's creator avatars. */
const palettes = [
  "linear-gradient(135deg,#ff2d9b,#a438ff)",
  "linear-gradient(135deg,#22e39a,#2bd4ff)",
  "linear-gradient(135deg,#ff8a2b,#ff2d9b)",
  "linear-gradient(135deg,#a438ff,#2bd4ff)",
  "linear-gradient(135deg,#ffc24b,#ff8a2b)",
  "linear-gradient(135deg,#2bd4ff,#a438ff)",
  "linear-gradient(135deg,#ff2d9b,#ff8a2b)",
  "linear-gradient(135deg,#22e39a,#ffc24b)",
];

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function paletteFor(seed: string) {
  return palettes[hash(seed) % palettes.length];
}

// Self-hosted portrait pool (8 real photos) for avatars without an explicit one.
const POOL_SIZE = 8;
function poolPortrait(seed: string) {
  return `/images/avatars/p${hash(seed) % POOL_SIZE}.jpg`;
}

const sizes = {
  xs: "h-8 w-8 text-[0.7rem]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-20 w-20 text-2xl",
};

export function Avatar({
  name,
  src,
  size = "md",
  ring = false,
  photo = true,
  className,
}: {
  name: string;
  /** Explicit portrait URL; falls back to a seeded photo from the pool. */
  src?: string;
  size?: keyof typeof sizes;
  ring?: boolean;
  /** Set false to force gradient initials with no photo. */
  photo?: boolean;
  className?: string;
}) {
  const img = src ?? (photo ? poolPortrait(name) : undefined);
  return (
    <span
      aria-hidden
      style={{ backgroundImage: paletteFor(name) }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white",
        sizes[size],
        ring && "ring-2 ring-white/15 ring-offset-2 ring-offset-bg",
        className
      )}
    >
      {/* Initials sit underneath as a graceful fallback if the photo is missing. */}
      <span className="absolute">{initials(name)}</span>
      {img && (
        // Avatars can be a self-hosted portrait or, in future, a creator's own
        // uploaded photo on another host — SmartImage handles both without
        // opening the image optimiser to arbitrary remote URLs.
        <SmartImage
          src={img}
          alt=""
          width={160}
          height={160}
          sizes="160px"
          className="relative h-full w-full object-cover"
        />
      )}
    </span>
  );
}
