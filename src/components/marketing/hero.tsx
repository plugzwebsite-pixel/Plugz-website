"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Aurora } from "./aurora";
import { CreatorCarousel } from "./creator-carousel";
import { Container } from "@/components/ui/primitives";
import type { CreatorCardData } from "@/lib/queries";
import { EASE_OUT } from "@/lib/motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export function Hero({
  creators,
  stats,
  creatorCount,
  copy,
}: {
  creators: CreatorCardData[];
  stats: { value: string; label: string }[];
  creatorCount: number;
  /** Editable from the admin. Falls back to what shipped when left empty. */
  copy?: { heroTitle?: string; heroSubtitle?: string };
}) {
  const router = useRouter();

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <section className="relative overflow-hidden pb-8">
      <Aurora intensity="soft" className="opacity-80" />

      {/* The wall of creators leads the page: the opening hook */}
      <div className="relative pt-8 sm:pt-10">
        <CreatorCarousel creators={creators} />
      </div>

      <Container className="relative pt-8 text-center sm:pt-10">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-2/70 px-4 py-1.5 text-xs font-medium text-text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent-green" />
              {`Live in the UK · shop ${creatorCount} creators' edits`}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.03] text-text-strong"
          >
            {copy?.heroTitle ? (
              copy.heroTitle
            ) : (
              <>
                Your favourite creators.
                <br />
                <span className="text-gradient italic">
                  Their favourite products.
                </span>
              </>
            )}
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted"
          >
            {copy?.heroSubtitle ??
              "The place where creators share what they actually buy, wear, eat, use and love."}
          </motion.p>

          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-text-muted"
          >
            Discover trusted recommendations, watch authentic reviews and shop
            directly from the brands, all in one seamless experience.
          </motion.p>

          <motion.div variants={item} className="mx-auto mt-8 max-w-2xl">
            <form onSubmit={onSearch} className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <input
                name="q"
                placeholder="Search &quot;get ready with me for a holiday&quot;…"
                className="h-14 w-full rounded-pill border border-border bg-surface-2/80 pr-5 text-[0.95rem] text-text placeholder:text-text-faint backdrop-blur transition-colors focus:border-brand-pink/60 focus:bg-surface"
                style={{ paddingLeft: "3.25rem" }}
              />
            </form>
          </motion.div>

          <motion.div
            variants={item}
            className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl font-semibold text-text-strong sm:text-5xl">
                  {s.value}
                </div>
                <div className="mt-1.5 text-xs uppercase tracking-wide text-text-faint">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
