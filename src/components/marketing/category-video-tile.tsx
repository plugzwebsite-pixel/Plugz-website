"use client";

import { useRef } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Category } from "@/lib/demo-data";

/**
 * Instagram-style category tile: a static cover image that plays a short,
 * muted, looping clip on hover. Falls back to a smooth cover zoom until real
 * category videos are supplied (set `category.video`).
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={category.cover}
        alt={category.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
      />
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
