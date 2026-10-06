"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

/** Removing a shopper's account from the admin directory. */
export function ShopperDeleteButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    setBusy(true);
    const res = await deleteJson(`/api/admin/shoppers/${id}`);
    setBusy(false);
    setConfirming(false);

    if (!res.ok) {
      toast.error("Couldn't delete that account", res.message);
      return;
    }
    toast.success("Account deleted");
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        loading={busy}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}'s account`}
        title="Delete this account"
      >
        <Trash2 size={14} />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${name}'s account?`}
        description="Their details, saved items and preferences go with it. This cannot be undone."
        onConfirm={remove}
        onClose={() => setConfirming(false)}
        busy={busy}
      />
    </>
  );
}
