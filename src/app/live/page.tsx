"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { LiveSnapshot, LiveStatus } from "@/lib/live";
import { QR_CODE_DARK, QR_CODE_LIGHT } from "@/lib/rotating-qr";

const POLL_MS = 10_000;
const PLACES = ["1st", "2nd", "3rd"];
const hourLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "numeric",
  hour12: true,
});

const HEADLINES: Record<LiveStatus, string> = {
  lobby: "Get ready to mix.",
  active: "Say hello.",
  ended: "That's a wrap.",
};

const STATUS_LABELS: Record<LiveStatus | "offline", string> = {
  lobby: "Starts soon",
  active: "Live",
  ended: "Final",
  offline: "Reconnecting",
};

export default function LivePage() {
  const [screenMode, setScreenMode] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [offline, setOffline] = useState(false);
  const [joinQr, setJoinQr] = useState("");
  const [joinHost, setJoinHost] = useState("");

  useEffect(() => {
    setScreenMode(new URLSearchParams(window.location.search).has("screen"));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/live");
        if (!response.ok) throw new Error("Live board unavailable");
        const next = (await response.json()) as LiveSnapshot;
        if (isMounted) {
          setSnapshot(next);
          setOffline(false);
        }
      } catch {
        if (isMounted) setOffline(true);
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll();
    };
    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!screenMode) return;
    let cancelled = false;
    setJoinHost(window.location.host);
    QRCode.toDataURL(window.location.origin, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 480,
      color: { dark: QR_CODE_DARK, light: QR_CODE_LIGHT },
    })
      .then((image) => !cancelled && setJoinQr(image))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [screenMode]);

  // Keep an unattended display from sleeping.
  useEffect(() => {
    if (!screenMode || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock.request("screen").then((sentinel) => {
        lock = sentinel;
      }).catch(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
    };
  }, [screenMode]);

  const status = snapshot?.status ?? "lobby";
  const chipStatus = offline ? "offline" : status;
  const meets = snapshot?.meets ?? 0;
  const players = snapshot?.players ?? 0;
  const top3 = snapshot?.top3 ?? [];
  const hours = snapshot?.recentHours ?? [];
  const busiestHour = Math.max(0, ...hours.map((hour) => hour.meets));

  return (
    <main className={`page-shell live-shell${screenMode ? " live-screen" : ""}`}>
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
        <span className={`live-status live-status-${chipStatus}`}>{STATUS_LABELS[chipStatus]}</span>
      </header>

      <section className="live-layout" aria-live="polite">
        <div className="live-hero">
          <p className="eyebrow">London / 3-5 November 2026</p>
          <h1>{HEADLINES[status]}</h1>
          <p className="live-number" key={meets}>{meets}</p>
          <p className="live-caption">
            {meets === 1 ? "meet" : "meets"} so far between {players} {players === 1 ? "player" : "players"}
          </p>
        </div>

        <section className="live-board" aria-labelledby="live-board-heading">
          <h2 id="live-board-heading">Top 3 scores</h2>
          {top3.length === 0 ? (
            <p className="home-muted">Scores appear after the first meet.</p>
          ) : (
            <ol className="live-tiers">
              {top3.map((tier, index) => (
                <li key={tier.points}>
                  <span className="live-place">{PLACES[index]}</span>
                  <strong>
                    {tier.points}
                    <small>{tier.points === 1 ? "pt" : "pts"}</small>
                  </strong>
                  <span>{tier.count} {tier.count === 1 ? "player" : "players"}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="home-muted">
            {status === "ended"
              ? "Winners are revealed on the big screen."
              : "Names stay secret until the final reveal."}
          </p>
        </section>

        <section className="live-activity" aria-labelledby="live-activity-heading">
          <h2 id="live-activity-heading">Meets per hour</h2>
          <div className="live-chart">
            {hours.map((hour, index) => (
              <div className="live-bar-col" key={hour.start}>
                <span
                  className={`live-bar${index === hours.length - 1 ? " live-bar-current" : ""}`}
                  style={{ height: `${busiestHour ? (hour.meets / busiestHour) * 100 : 0}%` }}
                  title={`${hour.meets} meets`}
                />
                <span className="live-bar-label">{hourLabel.format(hour.start)}</span>
              </div>
            ))}
          </div>
        </section>

        {screenMode ? (
          <aside className="live-join" aria-label="Join Critical Mixer">
            {joinQr && <img src={joinQr} alt="QR code to join Critical Mixer" />}
            <p className="live-join-title">Scan to join</p>
            <p className="home-muted">{joinHost}</p>
          </aside>
        ) : (
          <Link className="secondary-link live-back" href="/play">
            Back to my game
          </Link>
        )}
      </section>

      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}
