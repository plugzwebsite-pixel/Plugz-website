import { cn } from "@/lib/utils";

/**
 * Soft, drifting gradient blobs: the ambient "aurora" behind heroes and the
 * auth panel. Pure CSS animation so it's cheap and respects reduced-motion.
 */
export function Aurora({
  className,
  intensity = "medium",
}: {
  className?: string;
  intensity?: "soft" | "medium" | "strong";
}) {
  const opacity = { soft: 0.35, medium: 0.55, strong: 0.8 }[intensity];
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full blur-[90px] animate-float"
        style={{
          opacity,
          background:
            "radial-gradient(circle at 30% 30%, #ff2d9b, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute right-[-8%] top-[10%] h-[380px] w-[380px] rounded-full blur-[100px] animate-float"
        style={{
          opacity,
          background:
            "radial-gradient(circle at 50% 50%, #a438ff, transparent 70%)",
          animationDelay: "-2.5s",
        }}
      />
      <div
        className="absolute bottom-[-12%] left-[25%] h-[360px] w-[360px] rounded-full blur-[100px] animate-float"
        style={{
          opacity: opacity * 0.85,
          background:
            "radial-gradient(circle at 50% 50%, #ff8a2b, transparent 70%)",
          animationDelay: "-5s",
        }}
      />
    </div>
  );
}
