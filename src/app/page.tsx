"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { PlayerSession } from "@/lib/identity";

type ApiResponse = {
  session?: PlayerSession;
  error?: string;
};

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(/Teams|Slack|FBAN|FBAV|Instagram|LinkedInApp/i.test(navigator.userAgent));
  }, []);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.session) {
        throw new Error(result.error ?? "We couldn't create your account.");
      }

      localStorage.setItem("cmx:session", JSON.stringify(result.session));
      setSession(result.session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function continueToGame() {
    router.push("/play");
  }

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">
          CM
        </span>
        <span>Critical Mixer</span>
      </header>
      {session ? (
        <section className="form-layout" aria-labelledby="recovery-title">
          <div className="intro form-intro">
            <p className="eyebrow">Keep this somewhere safe</p>
            <h1 id="recovery-title">Your way back in.</h1>
            <p className="intro-copy">
              Screenshot this code. You will need it with your name if you
              switch phones or clear your browser.
            </p>
          </div>
          <div className="form-panel recovery-panel">
            <p className="field-label">Your recovery code</p>
            <output className="recovery-code">{session.recoveryCode}</output>
            <button className="primary-button" onClick={continueToGame}>
              Got it <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="form-layout" aria-labelledby="page-title">
          <div className="intro form-intro">
            <p className="eyebrow">London / 3-5 November 2026</p>
            <h1 id="page-title">Critical Mixer</h1>
            <p className="intro-copy">
              Three days. One office. A few more reasons to say hello.
            </p>
          </div>
          <div className="form-panel">
            <form onSubmit={handleJoin}>
              <label className="field-group">
                <span className="field-label">Your name</span>
                <input
                  autoComplete="name"
                  className="text-input"
                  maxLength={40}
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </label>
              {isInAppBrowser && (
                <p className="browser-notice">
                  Open in Safari or Chrome for the best experience.
                </p>
              )}
              {error && <p className="error-message" role="alert">{error}</p>}
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Joining…" : "Join Critical Mixer"}
              </button>
            </form>
            <p className="privacy-note">
              We use your name and game activity to run Critical Mixer, and
              delete your stored data after the event.
            </p>
            <Link className="secondary-link" href="/recover">
              Already playing? Log back in
            </Link>
          </div>
        </section>
      )}
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}