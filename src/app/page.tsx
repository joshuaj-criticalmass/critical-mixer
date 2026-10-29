"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { HowToPlay } from "@/components/HowToPlay";
import type { PlayerSession } from "@/lib/identity";
import { extractPlayerQrToken } from "@/lib/scan-utils";

type JoinResponse = {
  result?: "joined" | "exists" | "similar";
  session?: PlayerSession;
  name?: string;
  suggestions?: string[];
  error?: string;
};

type Prompt =
  | { kind: "exists"; name: string }
  | { kind: "similar"; suggestions: string[] }
  | null;

function gameDestination(): string {
  const scannedValue = new URLSearchParams(window.location.search).get("scan");
  const scanToken = extractPlayerQrToken(scannedValue);
  return scanToken ? `/m/${scanToken}` : "/play";
}

export default function Home() {
  const router = useRouter();
  const middleNameRef = useRef<HTMLInputElement>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [needsMiddleName, setNeedsMiddleName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Already joined on this device (e.g. after a refresh): go straight back in.
  useEffect(() => {
    if (localStorage.getItem("cmx:session")) {
      router.replace(gameDestination());
      return;
    }
    setCheckedSession(true);
    setIsInAppBrowser(/Teams|Slack|FBAN|FBAV|Instagram|LinkedInApp/i.test(navigator.userAgent));
  }, [router]);

  function startGame(session: PlayerSession) {
    localStorage.setItem("cmx:session", JSON.stringify(session));
    router.push(gameDestination());
  }

  async function join(allowSimilar: boolean) {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName, allowSimilar }),
        cache: "no-store",
      });
      const result = (await response.json()) as JoinResponse;

      if (result.result === "joined" && result.session) {
        startGame(result.session);
        return;
      }
      if (result.result === "exists" && result.name) {
        setPrompt({ kind: "exists", name: result.name });
        return;
      }
      if (result.result === "similar" && result.suggestions?.length) {
        setPrompt({ kind: "similar", suggestions: result.suggestions });
        return;
      }
      throw new Error(result.error ?? "We couldn't create your account.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logInAs(name: string) {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
      });
      const result = (await response.json()) as JoinResponse;
      if (!response.ok || !result.session) {
        throw new Error(result.error ?? "We couldn't log you in.");
      }
      startGame(result.session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.");
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // They've confirmed they're a different person, so a middle name is enough.
    const addedMiddleName = Boolean(needsMiddleName && middleName.trim());
    setPrompt(null);
    setNeedsMiddleName("");
    void join(addedMiddleName);
  }

  function notMe(name: string) {
    setPrompt(null);
    setNeedsMiddleName(name);
    middleNameRef.current?.focus();
  }

  if (!checkedSession) {
    return <main className="page-shell" aria-busy="true" />;
  }

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">
          CM
        </span>
        <span>Critical Mixer</span>
      </header>
      <section className="form-layout" aria-labelledby="page-title">
        <div className="intro form-intro">
          <p className="eyebrow">London / 3-5 November 2026</p>
          <h1 id="page-title">Critical Mixer</h1>
          <p className="intro-copy">
            Three days. One office. A few more reasons to say hello.
          </p>
          <section className="how-to-play-section" aria-labelledby="how-to-play-heading">
            <h2 id="how-to-play-heading" className="eyebrow">How to play</h2>
            <HowToPlay />
          </section>
        </div>
        <div className="form-panel">
          {prompt?.kind === "exists" ? (
            <div className="name-prompt" role="alertdialog" aria-labelledby="name-prompt-title">
              <p className="eyebrow" id="name-prompt-title">Already playing</p>
              <p className="name-prompt-copy">
                There&apos;s already a <strong>{prompt.name}</strong> playing. Is that you?
              </p>
              <button
                className="primary-button"
                disabled={isSubmitting}
                onClick={() => void logInAs(prompt.name)}
                type="button"
              >
                {isSubmitting ? "Logging in…" : <>Yes, log me in <span aria-hidden="true">→</span></>}
              </button>
              <button
                className="secondary-button"
                disabled={isSubmitting}
                onClick={() => notMe(prompt.name)}
                type="button"
              >
                No, that&apos;s someone else
              </button>
              {error && <p className="error-message" role="alert">{error}</p>}
            </div>
          ) : prompt?.kind === "similar" ? (
            <div className="name-prompt" role="alertdialog" aria-labelledby="name-prompt-title">
              <p className="eyebrow" id="name-prompt-title">Did you mean…</p>
              {prompt.suggestions.map((name) => (
                <button
                  className="primary-button"
                  disabled={isSubmitting}
                  key={name}
                  onClick={() => void logInAs(name)}
                  type="button"
                >
                  {name}? That&apos;s me <span aria-hidden="true">→</span>
                </button>
              ))}
              <button
                className="secondary-button"
                disabled={isSubmitting}
                onClick={() => void join(true)}
                type="button"
              >
                No, I&apos;m new. Join as {[firstName, middleName, lastName].filter((part) => part.trim()).join(" ")}
              </button>
              <button className="secondary-link name-prompt-back" onClick={() => setPrompt(null)} type="button">
                Edit my name
              </button>
              {error && <p className="error-message" role="alert">{error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="field-group">
                <span className="field-label">First name</span>
                <input
                  autoComplete="given-name"
                  className="text-input"
                  maxLength={30}
                  name="firstName"
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  value={firstName}
                />
              </label>
              <label className="field-group">
                <span className="field-label">
                  Middle name <span className="field-optional">(optional)</span>
                </span>
                <input
                  autoComplete="additional-name"
                  className="text-input"
                  maxLength={30}
                  name="middleName"
                  onChange={(event) => setMiddleName(event.target.value)}
                  ref={middleNameRef}
                  value={middleName}
                />
              </label>
              {needsMiddleName && (
                <p className="browser-notice" role="status">
                  There&apos;s already a {needsMiddleName} playing. Please add your middle name or
                  initial so we can tell you apart.
                </p>
              )}
              <label className="field-group">
                <span className="field-label">Last name</span>
                <input
                  autoComplete="family-name"
                  className="text-input"
                  maxLength={30}
                  name="lastName"
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  value={lastName}
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
          )}
          <p className="privacy-note">
            Already playing on another phone? Just enter the same name to log back in.
            We use your name and game activity to run Critical Mixer, and delete your
            stored data after the event.
          </p>
        </div>
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}
