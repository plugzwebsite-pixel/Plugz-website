import { cn } from "@/lib/utils";

/**
 * Placeholder blocks for a route that is still loading.
 *
 * These exist so a click is acknowledged immediately. Without a loading state
 * the App Router holds the previous screen, unchanged, until the whole payload
 * for the next one arrives — so a page that takes a second to build reads as a
 * dead button, and people click it again.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
    />
  );
}

/** Page heading: eyebrow, title, and the line of context under it. */
export function SkeletonHeading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** A row of stat tiles, as every dashboard opens with. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/** A table or list panel. */
export function SkeletonPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-5 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grid of product or creator cards. */
export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="aspect-[4/5] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
