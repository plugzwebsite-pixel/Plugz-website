"use client";

import { useCallback, useState } from "react";
import { ArtPanel } from "@/components/ui/art-panel";
import { SmartImage } from "@/components/ui/smart-image";

/**
 * A product photograph, with the drawn panel standing in when there isn't one.
 *
 * Every image here belongs to the brand that sells the item and is served from
 * their own CDN, so the URL working today guarantees nothing: hosts reorganise,
 * drop images, and start refusing requests from anywhere but their own site.
 * Callers already handled the case of no URL at all; this also handles the URL
 * that fails, which was leaving an empty box on the page with no explanation.
 */
export function ProductImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
  seed = "",
  label = "",
  spacerClassName,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Keeps the stand-in artwork identical wherever this product appears. */
  seed?: string;
  label?: string;
  /**
   * Sizes the gap the artwork fills. The panel is absolutely positioned, so a
   * container that took its height from the photograph collapses without one.
   */
  spacerClassName?: string;
  /**
   * Shown instead of the drawn panel. A labelled gradient is right for a card;
   * a 40px thumbnail wants a plain icon.
   */
  fallback?: React.ReactNode;
}) {
  // Remember which photograph failed rather than that one did. The same
  // component instance gets reused for a different product as a list reorders,
  // and a plain boolean would carry the last one's failure onto it.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !!src && failedSrc === src;

  const onError = useCallback(() => {
    if (src) setFailedSrc(src);
  }, [src]);

  // onError alone is not enough: a photograph that fails during the
  // server-rendered pass fires its error before React is listening, and the
  // page keeps the browser's own broken-image box. Check what loaded instead.
  //
  // Not for SVG. One with no width and height of its own reports a natural
  // size of zero even when it has drawn perfectly, and would be thrown away
  // for no reason. onError still catches an SVG that genuinely failed.
  const check = useCallback(
    (el: HTMLImageElement | null) => {
      if (!el || !src || /\.svgx?(\?|#|$)/i.test(src)) return;
      if (el.complete && el.naturalWidth === 0) setFailedSrc(src);
    },
    [src]
  );

  if (!src || failed) {
    return (
      fallback ?? (
        <>
          {spacerClassName && <div className={spacerClassName} />}
          <ArtPanel seed={seed} label={label} />
        </>
      )
    );
  }

  return (
    <SmartImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      onError={onError}
      imgRef={check}
      className={className}
    />
  );
}
