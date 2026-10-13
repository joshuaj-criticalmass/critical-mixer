"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { PlayerSession } from "@/lib/identity";
import {
  createPlayerQrToken,
  QR_CODE_DARK,
  QR_CODE_LIGHT,
  QR_WINDOW_MS,
} from "@/lib/rotating-qr";

type GameStatus = "loading" | "unavailable" | "lobby" | "active" | "ended";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("loading");
  const [serverOffset, setServerOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [qrImage, setQrImage] = useState("");

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

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const requestStartedAt = Date.now();

    async function loadGameStatus() {
      try {
        const response = await fetch("/api/me", {
          headers: {
            "x-player-id": session!.playerId,
            "x-session-sig": session!.sessionSig,
          },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Game status unavailable");

        const result = (await response.json()) as {
          serverTime: number;
          status: Exclude<GameStatus, "loading" | "unavailable">;
        };
        const requestFinishedAt = Date.now();
        setServerOffset(
          result.serverTime - (requestStartedAt + requestFinishedAt) / 2
        );
        setGameStatus(result.status);
      } catch {
        if (!controller.signal.aborted) setGameStatus("unavailable");
      }
    }

    void loadGameStatus();
    return () => controller.abort();
  }, [session]);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  const adjustedTime = currentTime + serverOffset;
  const currentWindow = Math.floor(adjustedTime / QR_WINDOW_MS);
  const elapsedInWindow = ((adjustedTime % QR_WINDOW_MS) + QR_WINDOW_MS) % QR_WINDOW_MS;
  const remainingMs = QR_WINDOW_MS - elapsedInWindow;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = (remainingMs / QR_WINDOW_MS) * 100;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function renderQrCode() {
      try {
        const token = await createPlayerQrToken(
          session!.playerId,
          session!.playerKey,
          currentWindow * QR_WINDOW_MS
        );
        const url = `${window.location.origin}/m/${token}`;
        const image = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 280,
          color: { dark: QR_CODE_DARK, light: QR_CODE_LIGHT },
        });
        if (!cancelled) setQrImage(image);
      } catch {
        if (!cancelled) setQrImage("");
      }
    }

    void renderQrCode();
    return () => {
      cancelled = true;
    };
  }, [currentWindow, session]);

  const statusMessage = gameStatus === "active"
    ? "Your code is live. Hold it up for someone to scan."
    : gameStatus === "ended"
      ? "The game has ended."
      : gameStatus === "unavailable"
        ? "Game setup is in progress."
        : "Game starts soon.";

  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="play-layout" aria-live="polite">
        {session && (
          <>
            <div className="play-copy">
              <h1>You're in, {session.name}.</h1>
              <p className="intro-copy">{statusMessage}</p>
              <details className="recovery-details">
                <summary>My recovery code</summary>
                <output className="recovery-code">{session.recoveryCode}</output>
              </details>
            </div>
            <div className="qr-panel">
              <div
                className="qr-ring"
                style={{ background: `conic-gradient(var(--color-primary) ${progress}%, var(--color-brand-black) 0)` }}
              >
                <div className={`qr-frame ${gameStatus === "active" ? "" : "qr-frame-inactive"}`}>
                  {qrImage ? (
                    <img className="qr-image" src={qrImage} alt={`Live QR code for ${session.name}`} />
                  ) : (
                    <span className="qr-placeholder">Loading code</span>
                  )}
                  {gameStatus !== "active" && <span className="qr-overlay">{statusMessage}</span>}
                </div>
              </div>
              <p className="qr-timer" aria-label={`Code refreshes in ${remainingSeconds} seconds`}>
                Refreshes in {remainingSeconds}s
              </p>
            </div>
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