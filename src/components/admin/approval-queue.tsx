"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Flag, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { compact } from "@/lib/utils";
import { postJson } from "@/lib/client/api";

export type Applicant = {
  id: string;
  name: string;
  handle: string;
  city: string | null;
  category: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "SUSPENDED";
  socials: { platform: string; followers: number }[];
};

const tabs = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "DECLINED", label: "Declined" },
] as const;

export function ApprovalQueue({ initial }: { initial: Applicant[] }) {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const counts = {
    PENDING: items.filter((i) => i.status === "PENDING").length,
    APPROVED: items.filter((i) => i.status === "APPROVED").length,
    DECLINED: items.filter((i) => i.status === "DECLINED").length,
  };
  const visible = items.filter((i) => i.status === tab);

  async function act(id: string, action: "approve" | "decline") {
    setBusy(id);
    const res = await postJson(`/api/admin/creators/${id}`, { action });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't update", res.message);
      return;
    }
    const status = action === "approve" ? "APPROVED" : "DECLINED";
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    toast.success(
      action === "approve" ? "Creator approved" : "Application declined",
      action === "approve" ? "They're now live on Pluggz." : undefined
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-pill bg-grad-brand px-4 py-2 text-sm font-semibold text-white shadow-glow-sm"
                : "rounded-pill border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-strong"
            }
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visible.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-md border border-dashed border-border py-16 text-center text-sm text-text-faint"
            >
              Nothing in {tab.toLowerCase()}.
            </motion.p>
          ) : (
            visible.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 sm:flex-row sm:items-center"
              >
                <Avatar name={a.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-display text-lg font-semibold text-text-strong">
                      {a.name}
                    </h3>
                    <span className="text-sm text-text-faint">@{a.handle}</span>
                    {a.city && (
                      <span className="inline-flex items-center gap-1 text-sm text-text-faint">
                        <MapPin size={13} /> {a.city}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    {a.category}
                    {a.socials.length > 0 && " · "}
                    {a.socials
                      .map(
                        (s) =>
                          `${s.platform[0].toUpperCase()}${s.platform.slice(1)} ${compact(s.followers)}`
                      )
                      .join(" · ")}
                  </p>
                </div>

                {a.status === "PENDING" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      loading={busy === a.id}
                      onClick={() => act(a.id, "approve")}
                    >
                      <Check size={15} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === a.id}
                      onClick={() => act(a.id, "decline")}
                    >
                      <X size={15} /> Decline
                    </Button>
                    <button
                      title="Flag as inappropriate"
                      onClick={() => act(a.id, "decline")}
                      className="grid h-9 w-9 place-items-center rounded-pill border border-border text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <Flag size={15} />
                    </button>
                  </div>
                ) : (
                  <span
                    className={
                      a.status === "APPROVED"
                        ? "rounded-pill bg-accent-green/12 px-3 py-1 text-xs font-semibold text-accent-green"
                        : "rounded-pill bg-red-500/12 px-3 py-1 text-xs font-semibold text-red-400"
                    }
                  >
                    {a.status}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
