"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScanResultSummary } from "@/components/ScanResultSummary";
import type { PlayerSession } from "@/lib/identity";
import { submitScan } from "@/lib/scan-client";
import { extractPlayerQrToken } from "@/lib/scan-utils";
import type { ScanOutcome } from "@/lib/scan-types";

export default function NativeScanPage() {
  const params = useParams<{ token: string }>();
  const token = extractPlayerQrToken(params.token);
  const submittedKey = useRef<string | null>(null);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const stored = localStorage.getItem("cmx:session");
    if (stored) {
      try {
        setSession(JSON.parse(stored) as PlayerSession);
      } catch {
        localStorage.removeItem("cmx:session");
      }
    }
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked || !session || !token) return;
    const key = `${session.playerId}:${token}`;
    if (submittedKey.current === key) return;
    submittedKey.current = key;
    void submitScan(token, session).then(setOutcome);
  }, [session, sessionChecked, token]);

  useEffect(() => {
    if (outcome?.result !== "pending") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [outcome]);

  const query = token ? `?scan=${encodeURIComponent(token)}` : "";
  const secondsLeft = outcome?.result === "pending"
    ? Math.max(0, Math.ceil((outcome.expiresAt - now) / 1000))
    : 0;

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="form-layout" aria-live="polite">
        <div className="intro form-intro">
          <p className="eyebrow">A new connection</p>
          <h1>Critical Mixer</h1>
          <p className="intro-copy">
            {session
              ? "Your scan will be sent automatically."
              : "Join the game or log back in to complete this scan."}
          </p>
        </div>
        <div className="form-panel recovery-panel">
          {!token ? (
            <p className="error-message" role="alert">This Critical Mixer link is invalid.</p>
          ) : !sessionChecked ? (
            <p className="privacy-note">Checking your game session…</p>
          ) : !session ? (
            <>
              <Link className="primary-button" href={`/${query}`}>
                Join to complete scan <span aria-hidden="true">→</span>
              </Link>
              <Link className="secondary-link" href={`/recover${query}`}>
                Already playing? Log back in
              </Link>
            </>
          ) : outcome ? (
            <section className={`scan-result scan-result-${outcome.result}`}>
              <ScanResultSummary outcome={outcome} secondsLeft={secondsLeft} />
              <Link className="secondary-link" href="/play">Back to game</Link>
            </section>
          ) : (
            <p className="privacy-note">Sending your scan…</p>
          )}
        </div>
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}