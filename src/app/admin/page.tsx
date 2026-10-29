"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type AdminStatus = "lobby" | "active" | "ended";
type AdminOverview = {
  status: AdminStatus;
  players: number;
  meets: number;
  top3: { points: number; count: number; players: { id: string; name: string }[] }[];
};
type RosterPlayer = { id: string; name: string; points: number; meetCount: number; createdAt: number };
type RosterSort = "points" | "name" | "newest";
type RecoveryLink = { name: string; url: string; expiresAt: number };

async function adminRequest<T>(
  adminKey: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      ...init.headers,
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Admin request failed.");
  return result;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");
  const [rosterSort, setRosterSort] = useState<RosterSort>("points");
  const [recoveryLink, setRecoveryLink] = useState<RecoveryLink | null>(null);
  const [qrData, setQrData] = useState("");
  const [wipeConfirmation, setWipeConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setAdminKey(sessionStorage.getItem("cmx:admin-key") ?? "");
  }, []);

  useEffect(() => {
    if (!recoveryLink) {
      setQrData("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(recoveryLink.url, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 240,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then((image) => {
      if (!cancelled) setQrData(image);
    }).catch(() => {
      if (!cancelled) setError("Couldn't render the recovery QR.");
    });
    return () => {
      cancelled = true;
    };
  }, [recoveryLink]);

  async function refreshOverview(key = adminKey): Promise<void> {
    if (!key) return;
    setError("");
    try {
      setOverview(await adminRequest<AdminOverview>(key, "/api/admin/overview"));
    } catch (caught) {
      setOverview(null);
      setError(caught instanceof Error ? caught.message : "Couldn't load the host overview.");
    }
    if (roster) await loadRoster(key);
  }

  async function loadRoster(key = adminKey): Promise<void> {
    if (!key) return;
    setIsBusy(true);
    try {
      const result = await adminRequest<{ players: RosterPlayer[] }>(key, "/api/admin/players");
      setRoster(result.players);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't load the player list.");
    } finally {
      setIsBusy(false);
    }
  }

  const visibleRoster = useMemo(() => {
    const query = rosterFilter.trim().toLocaleLowerCase("en-GB");
    const filtered = (roster ?? []).filter((player) =>
      !query || player.name.toLocaleLowerCase("en-GB").includes(query)
    );
    return filtered.sort((left, right) =>
      rosterSort === "name"
        ? left.name.localeCompare(right.name, "en-GB")
        : rosterSort === "newest"
          ? right.createdAt - left.createdAt
          : right.points - left.points || left.name.localeCompare(right.name, "en-GB")
    );
  }, [roster, rosterFilter, rosterSort]);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    void adminRequest<AdminOverview>(adminKey, "/api/admin/overview")
      .then((result) => {
        if (!cancelled) setOverview(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Couldn't load the host overview.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = inputKey.trim();
    if (!key) return;
    setIsBusy(true);
    setError("");
    try {
      await adminRequest<AdminOverview>(key, "/api/admin/overview");
      sessionStorage.setItem("cmx:admin-key", key);
      setAdminKey(key);
      setInputKey("");
      setMessage("Host access enabled for this tab.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Host access was denied.");
    } finally {
      setIsBusy(false);
    }
  }

  function lockAdmin() {
    sessionStorage.removeItem("cmx:admin-key");
    setAdminKey("");
    setOverview(null);
    setRoster(null);
    setRecoveryLink(null);
    setMessage("");
    setError("");
  }

  async function changeStatus(status: "active" | "ended") {
    const confirmation = status === "active"
      ? "Start the game now?"
      : "End the game and reveal the results?";
    if (!window.confirm(confirmation)) return;

    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<AdminOverview>(adminKey, "/api/admin/status", {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await refreshOverview();
      setMessage(status === "active" ? "Game started." : "Game ended.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't update game status.");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateRecoveryLink(playerId: string) {
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      setRecoveryLink(await adminRequest<RecoveryLink>(adminKey, "/api/admin/recovery-token", {
        method: "POST",
        body: JSON.stringify({ playerId }),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't generate a login QR.");
    } finally {
      setIsBusy(false);
    }
  }

  async function wipeGameData() {
    if (wipeConfirmation !== "WIPE") return;
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      const result = await adminRequest<{ deleted: number }>(adminKey, "/api/admin/wipe", {
        method: "POST",
        body: JSON.stringify({ confirm: wipeConfirmation }),
      });
      setOverview(null);
      setRoster(null);
      setRecoveryLink(null);
      setWipeConfirmation("");
      setMessage(`Deleted ${result.deleted} Critical Mixer keys.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't wipe game data.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="brand-mark" aria-hidden="true">CM</span>
          <div>
            <p className="eyebrow">Host console</p>
            <h1>Critical Mixer</h1>
          </div>
        </div>
        <div className="admin-header-actions">
          <a className="secondary-button" href="/live?screen" rel="noreferrer" target="_blank">
            Open big screen
          </a>
          {adminKey && <button className="secondary-button" onClick={lockAdmin} type="button">Lock</button>}
        </div>
      </header>

      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {message && <p className="admin-alert" role="status">{message}</p>}

      {!adminKey ? (
        <section className="admin-section admin-unlock" aria-labelledby="unlock-title">
          <div>
            <p className="eyebrow">Restricted access</p>
            <h2 id="unlock-title">Host sign-in</h2>
          </div>
          <form className="admin-unlock-form" onSubmit={handleUnlock}>
            <label className="field-group">
              <span className="field-label">Admin secret</span>
              <input
                autoComplete="current-password"
                className="text-input"
                onChange={(event) => setInputKey(event.target.value)}
                type="password"
                value={inputKey}
              />
            </label>
            <button className="primary-button" disabled={isBusy || !inputKey} type="submit">
              {isBusy ? "Checking…" : "Unlock host tools"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="admin-section" aria-labelledby="game-control-title">
            <div className="admin-section-heading">
              <div><p className="eyebrow">Game control</p><h2 id="game-control-title">Game status</h2></div>
              <span className={`status-label status-${overview?.status ?? "unknown"}`}>
                {overview?.status ?? "loading"}
              </span>
            </div>
            <div className="admin-actions">
              {overview?.status === "lobby" && (
                <button className="primary-button" disabled={isBusy} onClick={() => void changeStatus("active")}>
                  Start game
                </button>
              )}
              {overview?.status === "active" && (
                <button className="primary-button" disabled={isBusy} onClick={() => void changeStatus("ended")}>
                  End game
                </button>
              )}
              {overview?.status === "ended" && (
                <button className="primary-button" disabled={isBusy} onClick={() => void changeStatus("active")}>
                  Reopen game
                </button>
              )}
              <button className="secondary-button" disabled={isBusy} onClick={() => void refreshOverview()}>
                Refresh
              </button>
            </div>
          </section>

          <section className="admin-section" aria-labelledby="overview-title">
            <div><p className="eyebrow">Live glance</p><h2 id="overview-title">At a glance</h2></div>
            <div className="admin-metrics">
              <div><span>Players</span><strong>{overview?.players ?? "—"}</strong></div>
              <div><span>Confirmed meets</span><strong>{overview?.meets ?? "—"}</strong></div>
            </div>
            <ol className="admin-top3">
              {overview?.top3.map((tier, index) => (
                <li key={tier.points}>
                  <strong>{index + 1}</strong>
                  <span>{tier.points} pts · {tier.count} {tier.count === 1 ? "player" : "players"}</span>
                  <span>{tier.players.slice(0, 5).map((player) => player.name).join(", ")}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="admin-section" aria-labelledby="recovery-title">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Everyone playing</p>
                <h2 id="recovery-title">
                  Players{roster ? ` (${roster.length})` : ""}
                </h2>
              </div>
              <button className="secondary-button" disabled={isBusy} onClick={() => void loadRoster()} type="button">
                {roster ? "Refresh list" : "Show all players"}
              </button>
            </div>
            {roster && (
              <>
                <div className="admin-search">
                  <label className="field-group">
                    <span className="field-label">Filter by name</span>
                    <input
                      className="text-input"
                      onChange={(event) => setRosterFilter(event.target.value)}
                      value={rosterFilter}
                    />
                  </label>
                  <label className="field-group admin-sort">
                    <span className="field-label">Sort by</span>
                    <select
                      className="text-input select-input"
                      onChange={(event) => setRosterSort(event.target.value as RosterSort)}
                      value={rosterSort}
                    >
                      <option value="points">Points</option>
                      <option value="name">Name</option>
                      <option value="newest">Newest</option>
                    </select>
                  </label>
                </div>
                {visibleRoster.length === 0 ? (
                  <p className="home-muted">
                    {roster.length === 0 ? "No one has joined yet." : "No players match that name."}
                  </p>
                ) : (
                  <ul className="admin-player-list">
                    {visibleRoster.map((player) => (
                      <li key={player.id}>
                        <div>
                          <strong>{player.name}</strong>
                          <span>
                            {player.points} {player.points === 1 ? "pt" : "pts"} · {player.meetCount} met · joined{" "}
                            {new Date(player.createdAt).toLocaleString("en-GB", {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <button className="secondary-button" disabled={isBusy} onClick={() => void generateRecoveryLink(player.id)} type="button">
                          Generate login QR
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {recoveryLink && qrData && (
              <div className="recovery-qr-panel">
                <img src={qrData} alt={`One-time login QR for ${recoveryLink.name}`} />
                <div>
                  <strong>{recoveryLink.name}</strong>
                  <p>Single use · expires {new Date(recoveryLink.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                  <output>{recoveryLink.url}</output>
                </div>
              </div>
            )}
          </section>

          <section className="admin-section admin-danger" aria-labelledby="danger-title">
            <div>
              <p className="eyebrow">Danger zone</p>
              <h2 id="danger-title">Wipe all game data</h2>
              <p>This only deletes Critical Mixer keys with the <code>cmx:</code> prefix.</p>
            </div>
            <form className="wipe-form" onSubmit={(event) => { event.preventDefault(); void wipeGameData(); }}>
              <label className="field-group">
                <span className="field-label">Type WIPE to confirm</span>
                <input className="text-input" onChange={(event) => setWipeConfirmation(event.target.value)} value={wipeConfirmation} />
              </label>
              <button className="wipe-button" disabled={isBusy || wipeConfirmation !== "WIPE"} type="submit">
                Wipe all game data
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}