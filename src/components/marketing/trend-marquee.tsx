import { TRENDS } from "@/lib/demo-data";

/** Two infinite marquee rows drifting in opposite directions. */
export function TrendMarquee() {
  const rowA = [...TRENDS, ...TRENDS];
  const rowB = [...TRENDS.slice().reverse(), ...TRENDS.slice().reverse()];

  return (
    <div className="relative overflow-hidden py-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent"
      />
      <div className="flex w-max animate-marquee gap-3">
        {rowA.map((t, i) => (
          <Chip key={`a-${i}`}>{t}</Chip>
        ))}
      </div>
      <div
        className="mt-3 flex w-max gap-3 animate-marquee"
        style={{ animationDirection: "reverse", animationDuration: "44s" }}
      >
        {rowB.map((t, i) => (
          <Chip key={`b-${i}`}>{t}</Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-pill border border-border bg-surface-2/70 px-4 py-2 text-sm text-text-muted">
      {children}
    </span>
  );
}
