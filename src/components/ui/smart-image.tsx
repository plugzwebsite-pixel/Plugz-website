import Image from "next/image";
import { isOptimisableHost } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

/**
 * Picks the right image strategy for where the file actually lives.
 *
 * Files we host ourselves, and brand hosts on the allowlist in
 * src/lib/image-hosts.ts, go through the optimiser and come back resized to
 * the box they're rendered in. Anything else is served as-is: product photos
 * are scraped from whatever brand site a creator pasted, and optimising an
 * arbitrary hostname would turn this server into an open image proxy.
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
  onError,
  imgRef,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Called when the file will not load. Brand CDNs drop photographs without
   * warning, so anything rendering someone else's image wants a way to notice.
   * Client components only — passing it from a server component will not build.
   */
  onError?: () => void;
  /**
   * The underlying element. An image that 404s during the server-rendered pass
   * has already fired its error event before React attaches onError, so the
   * only way to notice is to look at what actually loaded.
   */
  imgRef?: (el: HTMLImageElement | null) => void;
}) {
  // Creator uploads are written after the build, so the optimiser can't read
  // them — Next indexes public/ at build time. They arrive already square,
  // already re-encoded and around 40KB, and nginx serves them straight from
  // disk, so there is nothing for the optimiser to add.
  const isUpload = src.startsWith("/uploads/");
  const optimisable = !isUpload && (src.startsWith("/") || isOptimisableHost(src));

  if (optimisable) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        onError={onError}
        ref={imgRef}
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
      onError={onError}
      ref={imgRef}
      className={cn(className)}
    />
  );
}
