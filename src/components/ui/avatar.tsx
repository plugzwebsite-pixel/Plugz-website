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

const sizes = {
  xs: "h-8 w-8 text-[0.7rem]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/**
 * A creator's portrait, or their initials on a gradient until one is supplied.
 *
 * There is deliberately no stand-in photograph. Dealing out stock headshots to
 * creators who hadn't sent one put pictures of real, identifiable people under
 * other people's names, and they were small enough to look blurry at this size
 * anyway. Initials stay sharp and are honestly empty.
 */
export function Avatar({
  name,
  src,
  size = "md",
  ring = false,
  className,
}: {
  name: string;
  /** The creator's own portrait. Omitted until they have actually sent one. */
  src?: string;
  size?: keyof typeof sizes;
  ring?: boolean;
  className?: string;
}) {
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
      {src && (
        // A portrait can be self-hosted or, in future, a creator's own uploaded
        // photo on another host — SmartImage handles both without opening the
        // image optimiser to arbitrary remote URLs.
        <SmartImage
          src={src}
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
