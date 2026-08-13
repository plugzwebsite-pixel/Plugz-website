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
  seed,
  label,
  spacerClassName,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Keeps the stand-in artwork identical wherever this product appears. */
  seed: string;
  label: string;
  /**
   * Sizes the gap the artwork fills. The panel is absolutely positioned, so a
   * container that took its height from the photograph collapses without one.
   */
  spacerClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  // onError alone is not enough: a photograph that fails during the
  // server-rendered pass fires its error before React is listening, and the
  // page keeps the browser's own broken-image box. Check what loaded instead.
  const check = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (!src || failed) {
    return (
      <>
        {spacerClassName && <div className={spacerClassName} />}
        <ArtPanel seed={seed} label={label} />
      </>
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
