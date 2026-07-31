"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  Store,
  Settings,
  ClipboardList,
  UserPlus,
  BarChart3,
  Percent,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/auth/jwt";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };

export type DashboardVariant = "creator" | "admin";

// Nav lives here (in the client component) — icon components are functions and
// can't be passed across the server/client boundary as props.
const NAVS: Record<DashboardVariant, NavItem[]> = {
  creator: [
    { label: "Dashboard", href: "/creator/dashboard", icon: LayoutDashboard },
    { label: "Storefront links", href: "/creator/storefront", icon: Store },
    { label: "Profile & settings", href: "/creator/settings", icon: Settings },
  ],
  admin: [
    { label: "Approvals", href: "/admin/approvals", icon: ClipboardList },
    { label: "Add creator", href: "/admin/creators/new", icon: UserPlus },
    { label: "Add brand", href: "/admin/brands/new", icon: Store },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Commission", href: "/admin/commission", icon: Percent },
    { label: "Payouts", href: "/admin/payouts", icon: Wallet },
  ],
};

const ROLE_LABELS: Record<DashboardVariant, string> = {
  creator: "Creator",
  admin: "Admin",
};

export function DashboardShell({
  user,
  variant,
  children,
}: {
  user: SessionUser;
  variant: DashboardVariant;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = NAVS[variant];
  const roleLabel = ROLE_LABELS[variant];

  const title =
    [...nav]
      .sort((a, b) => b.href.length - a.href.length)
      .find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
      ?.label ?? "";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Logo size="sm" href="/" />
          <span className="rounded-pill bg-surface-3 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-text-muted">
            {roleLabel}
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-full text-text-faint lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-text-muted hover:bg-surface-2 hover:text-text-strong"
              )}
            >
              {active && (
                <motion.span
                  layoutId="dash-active"
                  className="absolute inset-0 rounded-md bg-grad-brand shadow-glow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <Icon size={18} className="relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-strong">
              {user.name}
            </p>
            <p className="truncate text-xs text-text-faint">
              {user.handle ? `@${user.handle}` : user.email}
            </p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Link
            href="/"
            className="flex flex-1 items-center gap-2 rounded-sm px-2.5 py-2 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"
          >
            <ArrowLeft size={14} /> Back to Plugz
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-bg-elev lg:block">
        {sidebar}
      </aside>

      {/* Mobile off-canvas */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-bg-elev lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-5 sm:px-8">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-text-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <h1 className="font-display text-2xl font-semibold text-text-strong">
            {title}
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-5 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
