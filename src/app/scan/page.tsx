"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import type { PlayerSession } from "@/lib/identity";

type ScanOutcome =
  | {
      result: "pending";
      other: { id: string; name: string };
      icebreaker: string;
      expiresAt: number;
    }
  | {
      result: "confirmed";
      other: { id: string; name: string };
      points: 1;
      icebreaker: string;
    }
  | { result: "already_met"; other: { id: string; name: string } }
  | { result: "error"; message: string };

type ScanResponse = {
  result?: "pending" | "confirmed" | "already_met";
  other?: { id: string; name: string };
  icebreaker?: string;
  expiresAt?: number;
  points?: 1;
  error?: string;
};

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (error instanceof Error && error.message === "CAMERA_START_TIMEOUT") {
    return "Camera startup timed out. Allow camera access in your browser settings and try again.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was denied. Allow camera access in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "We couldn't find a camera on this device.";
  }
  if (!window.isSecureContext) {
    return "Camera scanning requires a secure connection. Open Critical Mixer over HTTPS.";
  }
  return "We couldn't start the camera. Check your browser's camera permissions and try again.";
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const handlingScan = useRef(false);
  const submitScanRef = useRef<(token: string) => Promise<void>>(async () => undefined);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [cameraMessage, setCameraMessage] = useState("Starting camera…");
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

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

  async function submitScan(token: string): Promise<void> {
    if (!session) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-player-id": session.playerId,
          "x-session-sig": session.sessionSig,
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      const result = (await response.json()) as ScanResponse;

      if (!response.ok) {
        setScanOutcome({
          result: "error",
          message: typeof result.error === "string"
            ? result.error
            : "We couldn't process that code. Please try again.",
        });
        return;
      }

      if (result.result === "pending" && result.other && result.icebreaker && result.expiresAt) {
        setScanOutcome({
          result: "pending",
          other: result.other,
          icebreaker: result.icebreaker,
          expiresAt: result.expiresAt,
        });
        return;
      }
      if (result.result === "confirmed" && result.other && result.icebreaker) {
        setScanOutcome({
          result: "confirmed",
          other: result.other,
          points: 1,
          icebreaker: result.icebreaker,
        });
        navigator.vibrate?.(65);
        return;
      }
      if (result.result === "already_met" && result.other) {
        setScanOutcome({ result: "already_met", other: result.other });
        return;
      }
      setScanOutcome({ result: "error", message: "We couldn't process that code. Please try again." });
    } catch {
      setScanOutcome({
        result: "error",
        message: "We couldn't reach the game. Check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
      handlingScan.current = false;
    }
  }

  submitScanRef.current = submitScan;

  useEffect(() => {
    if (!session || !videoRef.current) return;
    let disposed = false;
    let scanner: QrScanner | null = null;
    let startupTimeout: number | undefined;

    async function startScanner() {
      try {
        if (!window.isSecureContext) {
          throw new Error("Camera scanning requires a secure connection.");
        }

        const { default: QrScannerModule } = await import("qr-scanner");
        if (disposed || !videoRef.current) return;

        scanner = new QrScannerModule(
          videoRef.current,
          (result) => {
            if (handlingScan.current) return;
            handlingScan.current = true;
            scanner?.stop();
            void submitScanRef.current(result.data);
          },
          {
            preferredCamera: "environment",
            maxScansPerSecond: 8,
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
        );
        scannerRef.current = scanner;
        await Promise.race([
          scanner.start(),
          new Promise<never>((_, reject) => {
            startupTimeout = window.setTimeout(
              () => reject(new Error("CAMERA_START_TIMEOUT")),
              12_000
            );
          }),
        ]);
        if (startupTimeout !== undefined) window.clearTimeout(startupTimeout);
        if (!disposed) setCameraMessage("Point your camera at someone's Critical Mixer code.");
      } catch (error) {
        if (startupTimeout !== undefined) window.clearTimeout(startupTimeout);
        scanner?.stop();
        if (!disposed) setCameraMessage(cameraErrorMessage(error));
      }
    }

    void startScanner();
    return () => {
      disposed = true;
      if (startupTimeout !== undefined) window.clearTimeout(startupTimeout);
      scanner?.destroy();
      scannerRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    if (scanOutcome?.result !== "pending") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [scanOutcome]);

  async function scanAnother() {
    setScanOutcome(null);
    setCameraMessage("Point your camera at someone's Critical Mixer code.");
    handlingScan.current = false;
    try {
      await scannerRef.current?.start();
    } catch (error) {
      setCameraMessage(cameraErrorMessage(error));
    }
  }

  const secondsLeft = scanOutcome?.result === "pending"
    ? Math.max(0, Math.ceil((scanOutcome.expiresAt - now) / 1000))
    : 0;

  return (
    <main className="scanner-screen">
      <header className="scanner-header">
        <Link aria-label="Close scanner" className="scanner-close" href="/play">
          <span aria-hidden="true">×</span>
        </Link>
        <span className="scanner-title">Scan someone</span>
        <span className="brand-mark" aria-hidden="true">CM</span>
      </header>

      <section className="scanner-content" aria-live="polite">
        <div className="scanner-view">
          <video aria-label="Camera viewfinder" autoPlay muted playsInline ref={videoRef} />
          {!scanOutcome && cameraMessage && (
            <p className="scanner-message">{cameraMessage}</p>
          )}
          {isSubmitting && <p className="scanner-message">Checking that code…</p>}
        </div>

        {scanOutcome && (
          <section className={`scan-result scan-result-${scanOutcome.result}`}>
            {scanOutcome.result === "pending" && (
              <>
                <p className="eyebrow">Your scan is in</p>
                <h1>Now have {scanOutcome.other.name} scan you back.</h1>
                <p className="scan-countdown">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left to confirm
                </p>
                <blockquote>{scanOutcome.icebreaker}</blockquote>
              </>
            )}
            {scanOutcome.result === "confirmed" && (
              <>
                <p className="eyebrow">Connection confirmed</p>
                <h1>You met {scanOutcome.other.name}!</h1>
                <p className="scan-points">+1 point for both of you</p>
                <blockquote>{scanOutcome.icebreaker}</blockquote>
              </>
            )}
            {scanOutcome.result === "already_met" && (
              <>
                <p className="eyebrow">Already connected</p>
                <h1>You've already met {scanOutcome.other.name}.</h1>
              </>
            )}
            {scanOutcome.result === "error" && (
              <>
                <p className="eyebrow">Couldn't scan that</p>
                <p className="scan-error" role="alert">{scanOutcome.message}</p>
              </>
            )}
            <div className="scan-actions">
              <button className="primary-button" onClick={() => void scanAnother()} type="button">
                Scan another <span aria-hidden="true">→</span>
              </button>
              <Link className="secondary-link" href="/play">Back to game</Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}