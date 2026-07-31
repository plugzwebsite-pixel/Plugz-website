"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; title: string; description?: string };

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

let idSeq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = React.useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
      info: (title, description) => toast({ tone: "info", title, description }),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const icons = {
  success: <CheckCircle2 size={18} className="text-accent-green" />,
  error: <XCircle size={18} className="text-red-400" />,
  info: <Info size={18} className="text-accent-cyan" />,
};

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
      className="glass pointer-events-auto flex items-start gap-3 rounded-md border border-border-strong p-4 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]"
    >
      <span className="mt-0.5 shrink-0">{icons[toast.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-strong">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-text-muted">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className={cn(
          "shrink-0 rounded-full p-1 text-text-faint transition-colors hover:text-text-strong"
        )}
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
