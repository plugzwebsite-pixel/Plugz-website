"use client";

import { useEffect, useRef, useState } from "react";
import { hardNavigate } from "@/lib/auth/navigate";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth/jwt";
import { shortName } from "@/lib/utils";

// Every role, including BRAND. A brand contact whose menu sent them back to
// the homepage had no way into their own dashboard from here.
const roleHome: Record<string, string> = {
  ADMIN: "/admin/approvals",
  CREATOR: "/creator/dashboard",
  BRAND: "/brand/dashboard",
  SHOPPER: "/account",
};

const roleHomeLabel: Record<string, string> = {
  ADMIN: "Dashboard",
  CREATOR: "Dashboard",
  BRAND: "Dashboard",
  SHOPPER: "Your account",
};

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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
        className="flex items-center gap-2 rounded-pill border border-border bg-surface-2 py-1 pl-1 pr-2.5 transition-colors hover:border-border-strong"
      >
        <Avatar name={user.name} size="xs" />
        <span className="hidden text-sm font-medium text-text sm:block">
          {shortName(user.name)}
        </span>
        <ChevronDown size={14} className="text-text-faint" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="glass absolute right-0 mt-2 w-60 overflow-hidden rounded-md border border-border-strong p-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-text-strong">
                {user.name}
              </p>
              <p className="truncate text-xs text-text-faint">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href={roleHome[user.role] ?? "/"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"
            >
              <LayoutDashboard size={16} />{" "}
              {roleHomeLabel[user.role] ?? "Dashboard"}
            </Link>
            {user.role === "CREATOR" && (
              <Link
                href="/creator/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"
              >
                <Settings size={16} /> Profile & settings
              </Link>
            )}
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
