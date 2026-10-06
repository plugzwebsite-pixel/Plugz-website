"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

/** Removing a shopper's account from the admin directory. */
export function ShopperDeleteButton({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (
      !window.confirm(
        `Delete ${name}'s shopper account?

Their details, saved items and preferences go with it. ` +
          "This cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await deleteJson(`/api/admin/shoppers/${id}`);
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't delete that account", res.message);
      return;
    }
    toast.success("Account deleted");
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      loading={busy}
      onClick={remove}
      aria-label={`Delete ${name}'s account`}
      title="Delete this account"
    >
      <Trash2 size={14} />
    </Button>
  );
}
