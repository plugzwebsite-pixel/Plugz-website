"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isNight = theme === "night";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isNight ? "Switch to light theme" : "Switch to dark theme"}
      title={isNight ? "Light mode" : "Dark mode"}
      className={cn(
        "relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-text-muted transition-colors hover:text-text-strong hover:border-border-strong",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -18, opacity: 0, rotate: -35 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 35 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          className="absolute grid place-items-center"
        >
          {isNight ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
