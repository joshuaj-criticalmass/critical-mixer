"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { HowToPlay } from "@/components/HowToPlay";
import type { PlayerSession } from "@/lib/identity";
import { extractPlayerQrToken } from "@/lib/scan-utils";

type ApiResponse = {
  session?: PlayerSession;
  error?: string;
};

export default function Home() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [codeImage, setCodeImage] = useState<File | null>(null);

  useEffect(() => {
    setIsInAppBrowser(/Teams|Slack|FBAN|FBAV|Instagram|LinkedInApp/i.test(navigator.userAgent));
  }, []);

  // Pre-render so the share sheet opens within the tap's user-activation window.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    renderRecoveryImage(session)
      .then((file) => !cancelled && setCodeImage(file))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function saveCodeImage() {
    if (!codeImage) return;
    if (navigator.canShare?.({ files: [codeImage] })) {
      try {
        await navigator.share({ files: [codeImage], title: "Critical Mixer recovery code" });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(codeImage);
    const link = document.createElement("a");
    link.href = url;
    link.download = codeImage.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName }),
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
    const scannedValue = new URLSearchParams(window.location.search).get("scan");
    const scanToken = extractPlayerQrToken(scannedValue);
    router.push(scanToken ? `/m/${scanToken}` : "/play");
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
              Screenshot this code. You will need it with your first and last
              name if you
              switch phones or clear your browser.
            </p>
          </div>
          <div className="form-panel recovery-panel">
            <p className="field-label">Your recovery code</p>
            <output className="recovery-code">{session.recoveryCode}</output>
            <button
              className="secondary-button"
              disabled={!codeImage}
              onClick={saveCodeImage}
              type="button"
            >
              Save code image
            </button>
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
            <section className="how-to-play-section" aria-labelledby="how-to-play-heading">
              <h2 id="how-to-play-heading" className="eyebrow">How to play</h2>
              <HowToPlay />
            </section>
          </div>
          <div className="form-panel">
            <form onSubmit={handleJoin}>
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
                  value={middleName}
                />
              </label>
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

async function renderRecoveryImage(session: PlayerSession): Promise<File> {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  const body = `"${token("--font-body").replace(/"/g, "")}", sans-serif`;
  const display = `"${token("--font-display").replace(/"/g, "")}", sans-serif`;
  await Promise.all([
    document.fonts.load(`700 40px ${body}`),
    document.fonts.load(`400 40px ${body}`),
    document.fonts.load(`400 40px ${display}`),
  ]).catch(() => undefined);

  // Canvas can't parse color-mix(), so let the browser resolve each token to rgb().
  const probe = document.createElement("span");
  document.body.append(probe);
  const color = (name: string) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  const paper = color("--color-paper");
  const primary = color("--color-primary");
  const guide = color("--color-guide");
  const slate = color("--color-slate");
  const blue = color("--color-brand-calgary-blue");
  const ink = color("--color-text");
  probe.remove();

  const width = 1080;
  const height = 1920;
  const pad = 96;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  // Halftone corner.
  ctx.fillStyle = blue;
  for (let y = 0; y < 760; y += 16) {
    for (let x = 520; x < width + 16; x += 16) {
      const falloff = 1 - Math.hypot((x - 900) / 420, (y - 260) / 480);
      if (falloff > 0) {
        ctx.beginPath();
        ctx.arc(x, y, Math.min(7.5, falloff * 11), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Construction guides and dot.
  const guideX = 700;
  const guideY = 640;
  ctx.strokeStyle = guide;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(guideX, 0);
  ctx.lineTo(guideX, height);
  ctx.moveTo(0, guideY);
  ctx.lineTo(width, guideY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.arc(guideX, guideY, 26, 0, Math.PI * 2);
  ctx.fill();

  // CM logo.
  const logo = new Image();
  logo.src = "/cm-logo.svg";
  await logo.decode();
  ctx.drawImage(logo, pad, 170, 600, 600 * (111.32 / 484.91));
  ctx.fillStyle = blue;
  ctx.font = `700 34px ${body}`;
  ctx.fillText("YOUR RECOVERY CODE", pad, 860);

  ctx.fillStyle = primary;
  let size = 300;
  ctx.font = `${size}px ${display}`;
  while (ctx.measureText(session.recoveryCode).width > width - pad * 2 && size > 80) {
    size -= 8;
    ctx.font = `${size}px ${display}`;
  }
  ctx.fillText(session.recoveryCode, pad, 890 + size * 0.86);

  ctx.fillStyle = slate;
  ctx.fillRect(pad, 960 + size, 14, 150);
  ctx.fillStyle = ink;
  ctx.font = `700 52px ${body}`;
  ctx.fillText(session.name, pad + 44, 1020 + size, width - pad * 2 - 44);
  ctx.fillStyle = blue;
  ctx.font = `400 32px ${body}`;
  ctx.fillText("Use your first and last name and this code to log back in.", pad + 44, 1080 + size, width - pad * 2 - 44);

  ctx.fillStyle = primary;
  ctx.font = `400 120px ${display}`;
  ctx.fillText("CRITICAL MIXER", pad, height - 200);
  ctx.fillStyle = ink;
  ctx.font = `700 32px ${body}`;
  ctx.fillText("Critical Mass. London / 3-5 November 2026", pad, height - 130, width - pad * 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Image export failed");
  return new File([blob], `critical-mixer-${session.recoveryCode.toLowerCase()}.png`, {
    type: "image/png",
  });
}