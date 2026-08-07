"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "secondary" | "outline";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      loading={busy}
      onClick={signOut}
      className={className}
    >
      Sign out
    </Button>
  );
}
