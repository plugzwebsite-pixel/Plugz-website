"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

/** Removing a brand enquiry that needs no reply: a duplicate, a test, spam. */
export function EnquiryDeleteButton({ id, brand }: { id: string; brand: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (
      !window.confirm(
        `Delete the enquiry from ${brand}?

It disappears from this list. ` + "This cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await deleteJson(`/api/admin/enquiries/${id}`);
    setBusy(false);

    if (!res.ok) {
      toast.error("Couldn't delete that", res.message);
      return;
    }
    toast.success("Enquiry deleted");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Delete this enquiry"
      aria-label={`Delete the enquiry from ${brand}`}
      className="grid h-9 w-9 place-items-center rounded-pill text-text-faint transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
    >
      <Trash2 size={15} />
    </button>
  );
}
