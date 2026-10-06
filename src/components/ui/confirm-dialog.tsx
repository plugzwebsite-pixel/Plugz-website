"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * The in-app confirmation for destructive actions. Native confirm() boxes
 * look cheap next to the rest of the panel and misbehave in some browsers,
 * so deletes go through this instead.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-md border border-border bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <span
                className={
                  danger
                    ? "grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-red-500/12 text-red-400"
                    : "grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-accent-gold/12 text-accent-gold"
                }
              >
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-text-strong">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={busy}
                type="button"
              >
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={onConfirm}
                loading={busy}
                type="button"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
