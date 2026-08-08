"use client";

import { useRef } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { ArtPanel } from "@/components/ui/art-panel";
import { SmartImage } from "@/components/ui/smart-image";
import type { Category } from "@/lib/demo-data";

/**
 * Instagram-style category tile: a cover that plays a short, muted, looping
 * clip on hover.
 *
 * The tile renders at roughly 350x435, which is 700x870 on a retina screen, so
 * it only shows a photograph when one is actually supplied at that size —
 * `cover` stays unset until real category photography lands. Blowing a small
 * image up to fill this box was what made the grid look amateur, and cropping a
 * square one into 4:5 cut the subject off at both edges.
 */
export function CategoryVideoTile({ category }: { category: Category }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function play() {
    videoRef.current?.play().catch(() => {});
  }
  function stop() {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }

  return (
    <Link
      href={`/category/${category.slug}`}
      onMouseEnter={play}
      onMouseLeave={stop}
      className="group relative block aspect-[4/5] overflow-hidden rounded-lg border border-border"
    >
      {category.cover ? (
        <SmartImage
          src={category.cover}
          alt=""
          width={700}
          height={875}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        />
      ) : (
        <ArtPanel
          seed={category.slug}
          label={category.name}
          className="transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        />
      )}

      {category.video && (
        <video
          ref={videoRef}
          src={category.video}
          poster={category.cover}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
      />

      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors group-hover:bg-brand-pink">
        <Play size={14} className="translate-x-[1px]" fill="currentColor" />
      </span>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className="font-display text-xl font-semibold text-white">
          {category.name}
        </h3>
        <p className="mt-0.5 text-sm text-white/75">
          {category.edits} edits · shop the look
        </p>
      </div>
    </Link>
  );
}
