"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import type { CategoryRecord } from "@/lib/categories";
import type { SessionUser } from "@/lib/auth/jwt";
import { cn } from "@/lib/utils";

export function SiteHeader({ categories }: { categories: CategoryRecord[] }) {
  // The team chooses which of these belong in the bar; the sheet gets them all.
  const navCategories = categories.filter((c) => c.inNav);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Resolved on the client so the pages underneath stay cacheable. `undefined`
  // means "not known yet" and renders neither state, which avoids flashing a
  // Sign in button at someone who is already signed in.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUser(d?.data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled ? "glass border-b border-border" : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {navCategories.slice(0, 3).map((c, i) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className={cn(
                "rounded-pill px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong",
                // Between 1024 and 1280 the bar has to carry search and both
                // sign-up routes as well. The third category is what gives.
                i === 2 && "hidden xl:block"
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              name="q"
              placeholder="Search creators, products…"
              className="h-10 w-full rounded-pill border border-border bg-surface-2/70 pl-10 pr-4 text-sm text-text placeholder:text-text-faint transition-colors focus:border-brand-pink/60 focus:bg-surface"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          {user === undefined ? (
            // Hold the space while the session resolves, so the header doesn't
            // jump once it does.
            <span
              aria-hidden
              className="hidden h-9 w-40 animate-pulse rounded-pill bg-surface-2 sm:block"
            />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup/shopper" className="hidden lg:block">
                <Button variant="secondary" size="sm">
                  Sign up to shop
                </Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button size="sm">Join as Creator</Button>
              </Link>
            </>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-text-muted lg:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border glass lg:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text-strong"
                >
                  <span>{c.emoji}</span> {c.name}
                </Link>
              ))}
              {!user && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Link
                    href="/signup/shopper"
                    className="block"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Button className="w-full">Sign up to shop</Button>
                  </Link>
                  <div className="flex gap-2">
                    <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full">
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/signup" className="flex-1" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full">
                        Join as Creator
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
