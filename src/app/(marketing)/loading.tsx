import { Container } from "@/components/ui/primitives";
import { SkeletonHeading, SkeletonCards } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-14">
      <SkeletonHeading />
      <div className="mt-9">
        <SkeletonCards />
      </div>
    </Container>
  );
}
