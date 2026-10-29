"use client";

import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import type { PlayerSession } from "@/lib/identity";
import {
  createPlayerQrToken,
  QR_CODE_DARK,
  QR_CODE_LIGHT,
  QR_WINDOW_MS,
} from "@/lib/rotating-qr";

const SERVER_OFFSET_KEY = "cmx:server-offset";

export function rememberServerOffset(offset: number): void {
  sessionStorage.setItem(SERVER_OFFSET_KEY, String(Math.round(offset)));
}

export function usePlayerQr(session: PlayerSession | null, serverOffset?: number) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [storedOffset, setStoredOffset] = useState(0);
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    setStoredOffset(Number(sessionStorage.getItem(SERVER_OFFSET_KEY)) || 0);
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  const adjustedTime = currentTime + (serverOffset ?? storedOffset);
  const currentWindow = Math.floor(adjustedTime / QR_WINDOW_MS);
  const elapsedInWindow = ((adjustedTime % QR_WINDOW_MS) + QR_WINDOW_MS) % QR_WINDOW_MS;
  const remainingMs = QR_WINDOW_MS - elapsedInWindow;

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
        const image = await QRCode.toDataURL(`${window.location.origin}/m/${token}`, {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 640,
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

  return {
    qrImage,
    adjustedTime,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    progress: (remainingMs / QR_WINDOW_MS) * 100,
  };
}

export function PlayerQrCode({
  name,
  qr,
  inactive = false,
  overlay,
  className = "",
}: {
  name: string;
  qr: ReturnType<typeof usePlayerQr>;
  inactive?: boolean;
  overlay?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`qr-panel ${className}`}>
      <div
        className="qr-ring"
        style={{ background: `conic-gradient(var(--color-primary) ${qr.progress}%, var(--color-slate) 0)` }}
      >
        <div className={`qr-frame ${inactive ? "qr-frame-inactive" : ""}`}>
          {qr.qrImage ? (
            <img className="qr-image" src={qr.qrImage} alt={`Live QR code for ${name}`} />
          ) : (
            <span className="qr-placeholder">Loading code</span>
          )}
          {overlay && <span className="qr-overlay">{overlay}</span>}
        </div>
      </div>
      <p className="qr-timer" aria-label={`Code refreshes in ${qr.remainingSeconds} seconds`}>
        Refreshes in {qr.remainingSeconds}s
      </p>
    </div>
  );
}
