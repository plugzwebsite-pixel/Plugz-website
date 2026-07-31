"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/client/api";

type State = "loading" | "success" | "error";

export function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React strict-mode double-invoke
    ran.current = true;

    if (!token) {
      setState("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    (async () => {
      const res = await postJson("/api/auth/verify-email", { token });
      if (res.ok) {
        setState("success");
      } else {
        setState("error");
        setMessage(res.message ?? "We couldn't verify this link.");
      }
    })();
  }, [token]);

  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-8 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto animate-spin text-brand-pink" size={34} />
          <p className="mt-5 text-[0.95rem] text-text-muted">
            Verifying your email…
          </p>
        </>
      )}

      {state === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-green/15">
            <CheckCircle2 className="text-accent-green" size={34} />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
            Email verified
          </h2>
          <p className="mt-3 text-[0.95rem] text-text-muted">
            Your email is confirmed. If your creator application is approved,
            you&apos;ll get access to your dashboard.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="lg">Continue to sign in</Button>
          </Link>
        </motion.div>
      )}

      {state === "error" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-500/12">
            <XCircle className="text-red-400" size={34} />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold text-text-strong">
            Verification failed
          </h2>
          <p className="mt-3 text-[0.95rem] text-text-muted">{message}</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="secondary">Back to sign in</Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
