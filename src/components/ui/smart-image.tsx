import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Picks the right image strategy for where the file actually lives.
 *
 * Product photos are scraped from whatever brand site a creator pasted, so
 * their hostnames aren't known ahead of time. Configuring next/image to
 * optimise any remote host would turn this server into an open image proxy —
 * anyone could point it at arbitrary URLs and spend our CPU and bandwidth
 * resizing them. So remote images are served as-is, and only files we host
 * ourselves go through the optimiser.
 *
 * Both paths get explicit dimensions and lazy loading, which is what actually
 * stops the page jumping around as images arrive.
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const isLocal = src.startsWith("/");

  if (isLocal) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      // A brand's page shouldn't learn which creator's storefront sent the
      // shopper simply because their image was embedded.
      referrerPolicy="no-referrer"
      className={cn(className)}
    />
  );
}
