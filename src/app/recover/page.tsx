"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PlayerSession } from "@/lib/identity";
import { extractPlayerQrToken } from "@/lib/scan-utils";

type ApiResponse = {
  session?: PlayerSession;
  error?: string;
};

export default function RecoverPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRecover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, code }),
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.session) {
        throw new Error(result.error ?? "We couldn't restore your account.");
      }

      localStorage.setItem("cmx:session", JSON.stringify(result.session));
      const scannedValue = new URLSearchParams(window.location.search).get("scan");
      const scanToken = extractPlayerQrToken(scannedValue);
      router.replace(scanToken ? `/m/${scanToken}` : "/play");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="form-layout" aria-labelledby="page-title">
        <div className="intro form-intro">
          <p className="eyebrow">Welcome back</p>
          <h1 id="page-title">Pick up where you left off.</h1>
          <p className="intro-copy">Your first and last name and recovery code will get you back in.</p>
        </div>
        <div className="form-panel">
          <form onSubmit={handleRecover}>
            <label className="field-group">
              <span className="field-label">First name</span>
              <input
                autoComplete="given-name"
                className="text-input"
                maxLength={30}
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Last name</span>
              <input
                autoComplete="family-name"
                className="text-input"
                maxLength={30}
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Recovery code</span>
              <input
                autoCapitalize="characters"
                autoComplete="one-time-code"
                className="text-input recovery-input"
                maxLength={24}
                onChange={(event) => setCode(event.target.value)}
                placeholder="TANGO-OTTER-42"
                required
                spellCheck={false}
                value={code}
              />
            </label>
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Restoring…" : "Log back in"}
            </button>
          </form>
          <Link className="secondary-link" href="/">
            Back to join
          </Link>
        </div>
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}