"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, Trash2, ExternalLink, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

type DevMail = {
  id: string;
  to: string;
  subject: string;
  preview: string;
  link?: string;
  sentAt: string;
};

export default function DevMailboxPage() {
  const [mail, setMail] = useState<DevMail[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dev/mailbox").then((r) => r.json());
    setMail(res?.data?.mail ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function clear() {
    await fetch("/api/dev/mailbox", { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <Container className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
            >
              <ArrowLeft size={16} /> Home
            </Link>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </Container>
      </header>

      <Container className="py-10" size="narrow">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-gradient text-xs font-bold uppercase tracking-[0.2em]">
              Development only
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-text-strong">
              Dev mailbox
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Verification and password-reset emails are captured here instead of
              being sent, so you can test the full flow locally.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </Button>
            {mail.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <Trash2 size={15} /> Clear
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="text-sm text-text-faint">Loading…</p>
          ) : mail.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-16 text-center">
              <Mail className="mx-auto text-text-faint" size={28} />
              <p className="mt-3 text-sm text-text-muted">
                No emails yet. Sign up or request a password reset to see one here.
              </p>
            </div>
          ) : (
            mail.map((m) => (
              <div
                key={m.id}
                className="rounded-md border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-strong">
                      {m.subject}
                    </p>
                    <p className="mt-0.5 text-sm text-text-faint">To: {m.to}</p>
                    <p className="mt-2 text-sm text-text-muted">{m.preview}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-faint">
                    {new Date(m.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                {m.link && (
                  <Link
                    href={m.link.replace(/^https?:\/\/[^/]+/, "")}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink hover:underline"
                  >
                    Open link <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </Container>
    </div>
  );
}
