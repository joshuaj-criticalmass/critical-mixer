"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import type { PlayerSession } from "@/lib/identity";
import { PlayerQrCode, usePlayerQr } from "@/components/PlayerQr";
import { ScanResultSummary } from "@/components/ScanResultSummary";
import { submitScan } from "@/lib/scan-client";
import type { ScanOutcome } from "@/lib/scan-types";

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

  async function handleScanToken(token: string): Promise<void> {
    if (!session) return;

    setIsSubmitting(true);
    const outcome = await submitScan(token, session);
    setScanOutcome(outcome);
    if (outcome.result === "confirmed") navigator.vibrate?.(65);
    setIsSubmitting(false);
    handlingScan.current = false;
  }

  submitScanRef.current = handleScanToken;

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
  const qr = usePlayerQr(session);
  // After a first scan the other person needs *your* code, so it replaces the camera.
  const showMyCode = scanOutcome?.result === "pending";

  return (
    <main className="scanner-screen">
      <header className="scanner-header">
        <Link aria-label="Close scanner" className="scanner-close" href="/play">
          <span aria-hidden="true">×</span>
        </Link>
        <span className="scanner-title">Scan someone</span>
        <span className="brand-mark" aria-hidden="true">CM</span>
      </header>

      <section className={`scanner-content${showMyCode ? " scanner-content-my-code" : ""}`} aria-live="polite">
        <div className="scanner-view" hidden={showMyCode}>
          <video aria-label="Camera viewfinder" autoPlay muted playsInline ref={videoRef} />
          {!scanOutcome && cameraMessage && (
            <p className="scanner-message">{cameraMessage}</p>
          )}
          {isSubmitting && <p className="scanner-message">Checking that code…</p>}
        </div>

        {showMyCode && session && (
          <PlayerQrCode className="qr-panel-hero" name={session.name} qr={qr} />
        )}

        {scanOutcome && (
          <section className={`scan-result scan-result-${scanOutcome.result}`}>
            <ScanResultSummary outcome={scanOutcome} secondsLeft={secondsLeft} />
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