"use client";

import { useState } from "react";
import { hardNavigate } from "@/lib/auth/navigate";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "secondary" | "outline";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    hardNavigate("/");
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
