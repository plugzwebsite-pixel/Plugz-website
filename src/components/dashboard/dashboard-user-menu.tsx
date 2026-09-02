"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { hardNavigate } from "@/lib/auth/navigate";
import type { SessionUser } from "@/lib/auth/jwt";
import { shortName } from "@/lib/utils";

/**
 * Who you are signed in as, and the way out.
 *
 * This belongs in the header rather than the foot of the sidebar. Admin has
 * eleven nav items, and on a laptop those pushed the account block off the
 * bottom of the screen with nothing to scroll, so Sign out simply vanished on
 * most pages. The header is the one part of the frame that is always in view.
 */
export function DashboardUserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    hardNavigate("/");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-pill border border-border bg-surface-2 py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong"
      >
        <Avatar name={user.name} size="xs" />
        <span className="hidden max-w-28 truncate text-sm font-medium text-text sm:block">
          {shortName(user.name)}
        </span>
        <ChevronDown size={14} className="text-text-faint" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="glass absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-md border border-border-strong p-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-text-strong">
                {user.name}
              </p>
              <p className="truncate text-xs text-text-faint">
                {user.handle ? `@${user.handle}` : user.email}
              </p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"
            >
              <ArrowLeft size={16} /> Back to Pluggz
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={16} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
