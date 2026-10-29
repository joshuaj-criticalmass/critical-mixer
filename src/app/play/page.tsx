"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { HowToPlay } from "@/components/HowToPlay";
import type { PlayerSession } from "@/lib/identity";
import {
  createPlayerQrToken,
  QR_CODE_DARK,
  QR_CODE_LIGHT,
  QR_WINDOW_MS,
} from "@/lib/rotating-qr";

type GameStatus = "loading" | "unavailable" | "lobby" | "active" | "ended";
type PlayerTotals = { points: number; meetCount: number };
type LeaderboardTier = {
  points: number;
  count: number;
  players?: { id: string; name: string }[];
};
type Winner = { name: string; points: number };
type PendingScan = { id: string; name: string; scannedAt: number };
type MetPerson = { id: string; name: string; metAt: number };
const POLL_MS = 30_000;

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("loading");
  const [serverOffset, setServerOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [qrImage, setQrImage] = useState("");
  const [playerTotals, setPlayerTotals] = useState<PlayerTotals>({ points: 0, meetCount: 0 });
  const [top3, setTop3] = useState<LeaderboardTier[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [metPeople, setMetPeople] = useState<MetPerson[]>([]);
  const [metLoaded, setMetLoaded] = useState(false);
  const [metLoading, setMetLoading] = useState(false);
  const [metError, setMetError] = useState("");

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
    let isMounted = true;
    let isPolling = false;

    async function pollPlayerState() {
      if (!isMounted || document.visibilityState !== "visible" || isPolling) return;
      isPolling = true;
      const requestStartedAt = Date.now();
      try {
        const response = await fetch("/api/me", {
          headers: {
            "x-player-id": session!.playerId,
            "x-session-sig": session!.sessionSig,
          },
          cache: "no-store",
        });
        if (response.status === 410) {
          localStorage.removeItem("cmx:session");
          router.replace("/");
          return;
        }
        if (!response.ok) throw new Error("Game status unavailable");

        const result = (await response.json()) as {
          serverTime: number;
          status: Exclude<GameStatus, "loading" | "unavailable">;
          me: PlayerTotals;
          top3: LeaderboardTier[];
          pending: PendingScan[];
          winners?: Winner[];
        };
        const requestFinishedAt = Date.now();
        if (isMounted) {
          setServerOffset(result.serverTime - (requestStartedAt + requestFinishedAt) / 2);
          setGameStatus(result.status);
          setPlayerTotals(result.me);
          setTop3(result.top3);
          setPendingScans(result.pending);
          setWinners(result.status === "ended" ? result.winners ?? [] : []);
        }
      } catch {
        if (isMounted) setGameStatus("unavailable");
      } finally {
        isPolling = false;
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void pollPlayerState();
    };
    void pollPlayerState();
    const interval = window.setInterval(() => void pollPlayerState(), POLL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, session]);

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

  async function loadMetHistory(): Promise<void> {
    if (!session || metLoaded || metLoading) return;
    setMetLoading(true);
    setMetError("");
    try {
      const response = await fetch("/api/met", {
        headers: {
          "x-player-id": session.playerId,
          "x-session-sig": session.sessionSig,
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("People list unavailable");
      const result = (await response.json()) as { people: MetPerson[] };
      setMetPeople(result.people);
      setMetLoaded(true);
    } catch {
      setMetError("Couldn't load your list. Open this section to try again.");
    } finally {
      setMetLoading(false);
    }
  }

  const thirdTier = top3[2];
  const pointsToTop3 = thirdTier && playerTotals.points < thirdTier.points
    ? thirdTier.points - playerTotals.points + 1
    : 0;

  return (
    <main className="page-shell poppy-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <section className="play-layout">
        {session && (
          <>
            {gameStatus === "ended" ? (
              <section className="results-layout" aria-live="polite">
                <div className="results-heading">
                  <p className="eyebrow">London · 3-5 November 2026</p>
                  <h1>That's a wrap!</h1>
                  <p className="intro-copy">
                    {winners.length === 1 ? "Our top scorer" : `It's a tie · ${winners.length} winners`}
                  </p>
                </div>
                <div className="results-winners">
                  {winners.map((winner, index) => (
                    <div className="winner-row" key={`${winner.name}-${index}`}>
                      <strong>{winner.name}</strong>
                      <span>{winner.points} pts</span>
                    </div>
                  ))}
                  {winners.length === 0 && <p className="home-muted">Results are not available yet.</p>}
                </div>
                <div className="results-details">
                  <section className="home-group" aria-labelledby="final-tiers-heading">
                    <h2 id="final-tiers-heading">Top score tiers</h2>
                    <ol className="leaderboard-list">
                      {top3.map((tier, index) => (
                        <li className="leaderboard-item leaderboard-final-tier" key={tier.points}>
                          <span>{index + 1}{index === 0 ? "st" : index === 1 ? "nd" : "rd"}</span>
                          <strong>{tier.points} pts</strong>
                          <span>{tier.players?.map((player) => player.name).join(", ")}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className="home-group" aria-labelledby="final-stats-heading">
                    <h2 id="final-stats-heading">Your final stats</h2>
                    <p className="score-total">{playerTotals.points}</p>
                    <p>{playerTotals.meetCount} people met</p>
                  </section>
                </div>
              </section>
            ) : (
              <>
            <div className="play-copy">
              <h1>You're in, {session.name}.</h1>
              <p className="intro-copy" aria-live="polite">{statusMessage}</p>
              {gameStatus === "active" ? (
                <Link className="primary-button scan-link" href="/scan">
                  Scan someone <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <button className="primary-button" disabled type="button">
                  Scan someone <span aria-hidden="true">→</span>
                </button>
              )}
              <details className="recovery-details">
                <summary>How to play</summary>
                <HowToPlay />
                <Link className="secondary-link" href="/rules">
                  Read the full rules <span aria-hidden="true">→</span>
                </Link>
              </details>
            </div>
            <div className="qr-panel">
              <div
                className="qr-ring"
                style={{ background: `conic-gradient(var(--color-primary) ${progress}%, var(--color-slate) 0)` }}
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
            <section className="home-data-grid" aria-label="Your game progress">
              <section className="home-group" aria-labelledby="score-heading">
                <h2 id="score-heading">Your score</h2>
                <p className="score-total">{playerTotals.points}</p>
                <p>{playerTotals.meetCount} people met</p>
              </section>

              <section className="home-group" aria-labelledby="pending-heading" aria-live="polite">
                <h2 id="pending-heading">Scan-backs</h2>
                {pendingScans.length === 0 ? (
                  <p className="home-muted">No one is waiting for a scan-back.</p>
                ) : (
                  <ul className="pending-list">
                    {pendingScans.map((pending) => {
                      const secondsLeft = Math.max(
                        0,
                        Math.ceil((pending.scannedAt + 10 * 60 * 1000 - adjustedTime) / 1000)
                      );
                      return (
                        <li key={pending.id} className="pending-item">
                          <span>{pending.name} scanned you</span>
                          <span>Scan back to confirm · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="home-group" aria-labelledby="leaderboard-heading">
                <h2 id="leaderboard-heading">Top 3 tiers</h2>
                {top3.length === 0 ? (
                  <p className="home-muted">Leaderboard appears when scores are in.</p>
                ) : (
                  <ol className="leaderboard-list">
                    {top3.map((tier, index) => (
                      <li className="leaderboard-item" key={tier.points}>
                        <span>{index + 1}{index === 0 ? "st" : index === 1 ? "nd" : "rd"}</span>
                        <span>{tier.count} {tier.count === 1 ? "player" : "players"}</span>
                        <strong>{tier.points} pts</strong>
                      </li>
                    ))}
                  </ol>
                )}
                {pointsToTop3 > 0 && top3.length === 3 && (
                  <p className="leaderboard-nudge">{pointsToTop3} more {pointsToTop3 === 1 ? "point" : "points"} to reach the top 3</p>
                )}
                <Link className="secondary-link live-link" href="/live">
                  See the live board <span aria-hidden="true">→</span>
                </Link>
              </section>

              <details className="home-group met-group" onToggle={(event) => {
                if (event.currentTarget.open) void loadMetHistory();
              }}>
                <summary>People you've met</summary>
                {metLoading && <p className="home-muted">Loading…</p>}
                {metError && <p className="error-message" role="alert">{metError}</p>}
                {metLoaded && metPeople.length === 0 && (
                  <p className="home-muted">Your list will grow after your first meet.</p>
                )}
                {metPeople.length > 0 && (
                  <ul className="met-list">
                    {metPeople.map((person) => (
                      <li key={person.id}>
                        <span>{person.name}</span>
                        <time dateTime={new Date(person.metAt).toISOString()}>
                          {new Date(person.metAt).toLocaleString("en-GB", {
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </section>
              </>
            )}
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