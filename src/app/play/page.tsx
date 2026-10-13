"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerSession } from "@/lib/identity";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cmx:session");
    if (!stored) {
      router.replace("/");
      return;
    }

    try {
      setSession(JSON.parse(stored) as PlayerSession);
    } catch {
      localStorage.removeItem("cmx:session");
      router.replace("/");
    }
  }, [router]);

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="intro play-intro" aria-live="polite">
        {session && (
          <>
            <p className="eyebrow">{session.company}</p>
            <h1>You're in, {session.name}.</h1>
            <details className="recovery-details">
              <summary>My recovery code</summary>
              <output className="recovery-code">{session.recoveryCode}</output>
            </details>
          </>
        )}
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}