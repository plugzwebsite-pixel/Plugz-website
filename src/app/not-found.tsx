import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/marketing/aurora";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">
      <Aurora intensity="soft" />
      <div className="relative z-10">
        <Logo size="lg" href="/" />
        <p className="mt-10 font-display text-[clamp(4rem,16vw,9rem)] font-semibold leading-none text-gradient">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text-strong">
          This plug&apos;s gone missing
        </h1>
        <p className="mx-auto mt-3 max-w-md text-text-muted">
          The page you&apos;re after doesn&apos;t exist or has moved. Let&apos;s get
          you back to the good stuff.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              <Home size={17} /> Back home
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              <Search size={17} /> Search Pluggz
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
