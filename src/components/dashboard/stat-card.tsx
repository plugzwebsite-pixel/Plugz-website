import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  value,
  label,
  sub,
  delta,
  icon: Icon,
}: {
  value: string;
  label: string;
  sub?: string;
  delta?: number;
  icon?: LucideIcon;
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <span className="absolute left-5 top-0 h-0.5 w-10 rounded-b bg-grad-brand" />
      <div className="flex items-start justify-between">
        <span className="font-display text-4xl font-semibold text-text-strong">
          {value}
        </span>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-muted">
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-text">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              delta >= 0 ? "text-accent-green" : "text-red-400"
            )}
          >
            {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {sub && <span className="text-text-faint">{sub}</span>}
      </div>
    </div>
  );
}
