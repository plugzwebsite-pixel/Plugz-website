import { SkeletonHeading, SkeletonStats, SkeletonPanel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <SkeletonHeading />
      <SkeletonStats />
      <SkeletonPanel rows={5} />
    </div>
  );
}
