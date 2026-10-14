"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PlayerSession } from "@/lib/identity";

type RedemptionResponse = {
  session?: PlayerSession;
  error?: string;
};

export default function AdminRecoveryPage() {
  const { signedToken } = useParams<{ signedToken: string }>();
  const router = useRouter();
  const redeemedToken = useRef<string | null>(null);
  const [message, setMessage] = useState("Restoring your player session…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signedToken || redeemedToken.current === signedToken) return;
    redeemedToken.current = signedToken;

    async function redeem() {
      try {
        const response = await fetch("/api/recover-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: signedToken }),
          cache: "no-store",
        });
        const result = (await response.json()) as RedemptionResponse;
        if (!response.ok || !result.session) {
          throw new Error(result.error ?? "This login link is invalid or expired.");
        }

        localStorage.setItem("cmx:session", JSON.stringify(result.session));
        setMessage("Session restored. Taking you to the game…");
        router.replace("/play");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "This login link is invalid or expired.");
        setMessage("");
      }
    }

    void redeem();
  }, [router, signedToken]);

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="intro" aria-live="polite">
        <p className="eyebrow">Player recovery</p>
        <h1>{error ? "This link needs a refresh." : "Welcome back."}</h1>
        <p className={error ? "error-message" : "intro-copy"} role={error ? "alert" : "status"}>
          {error || message}
        </p>
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}