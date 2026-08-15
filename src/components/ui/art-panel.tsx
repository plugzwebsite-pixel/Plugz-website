import { cn } from "@/lib/utils";

/**
 * Deterministic artwork for anything that has no photograph of its own.
 *
 * A product added through paste-a-URL arrives with the brand's own image, but
 * seeded rows and half-finished listings don't have one, and stretching a small
 * placeholder across a large tile reads as a mistake. Drawing the panel instead
 * costs no bytes, stays sharp at any size, crops nothing, and looks deliberate
 * next to the real photography it sits beside.
 *
 * The gradient is derived from the seed, so a given product or category keeps
 * the same artwork on every render and across every page it appears on.
 */

const duotones = [
  ["#ff2d9b", "#a438ff"],
  ["#22e39a", "#2bd4ff"],
  ["#ff8a2b", "#ff2d9b"],
  ["#a438ff", "#2bd4ff"],
  ["#ffc24b", "#ff8a2b"],
  ["#2bd4ff", "#a438ff"],
  ["#ff2d9b", "#ff8a2b"],
  ["#22e39a", "#ffc24b"],
];

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function ArtPanel({
  seed,
  label,
  className,
}: {
  /** Anything stable: a slug, a product name, a brand. Picks the palette. */
  seed: string;
  /** Drawn very faintly across the panel as a graphic, not as readable copy. */
  label?: string;
  className?: string;
}) {
  const h = hash(seed);
  const [from, to] = duotones[h % duotones.length];
  // Nudge the highlight around so tiles side by side don't look stamped.
  const x = 20 + (h % 5) * 15;
  const y = 18 + ((h >> 3) % 5) * 14;

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at ${x}% ${y}%, rgba(255,255,255,0.42), transparent 70%)`,
        }}
      />
      {/* Fine diagonal grain keeps a flat gradient from banding on big tiles. */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 4px)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      {label && (
        <span className="absolute -bottom-3 left-2 select-none font-display text-[5.5rem] font-semibold leading-none text-white/10">
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
