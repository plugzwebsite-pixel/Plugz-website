"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <Logo size="lg" href="/" />
      <h1 className="mt-10 font-display text-4xl font-semibold text-text-strong">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-text-muted">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          <RotateCcw size={17} /> Try again
        </Button>
        <Link href="/">
          <Button size="lg" variant="secondary" className="w-full sm:w-auto">
            <Home size={17} /> Back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
