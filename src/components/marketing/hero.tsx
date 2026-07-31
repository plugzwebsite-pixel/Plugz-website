"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Aurora } from "./aurora";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { STATS } from "@/lib/demo-data";
import { EASE_OUT } from "@/lib/motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export function Hero() {
  const router = useRouter();

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <section className="relative overflow-hidden">
      <Aurora intensity="soft" className="opacity-80" />
      <Container className="relative py-20 text-center sm:py-28">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-2/70 px-4 py-1.5 text-xs font-medium text-text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent-green" />
              Live in the UK · 62 creators and counting
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mx-auto mt-7 max-w-4xl font-display text-[clamp(2.6rem,7vw,4.5rem)] font-semibold leading-[1.02] text-text-strong"
          >
            Shop what the UK&apos;s
            <br />
            tastemakers <span className="text-gradient italic">actually plug.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted"
          >
            A curated directory of the creators you follow and the exact products
            they swear by — from 7-step skincare to the holiday edit. Discover it
            here, buy it at the brand.
          </motion.p>

          <motion.div
            variants={item}
            className="mx-auto mt-9 flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row"
          >
            <form onSubmit={onSearch} className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <input
                name="q"
                placeholder="Search &quot;get ready with me for a holiday&quot;…"
                className="h-14 w-full rounded-pill border border-border bg-surface-2/80 pl-13 pr-5 text-[0.95rem] text-text placeholder:text-text-faint backdrop-blur transition-colors focus:border-brand-pink/60 focus:bg-surface"
                style={{ paddingLeft: "3.25rem" }}
              />
            </form>
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                <Sparkles size={18} /> Become a Creator
              </Button>
            </Link>
          </motion.div>

          <motion.div
            variants={item}
            className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4"
          >
            {STATS.map((s) => (
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
