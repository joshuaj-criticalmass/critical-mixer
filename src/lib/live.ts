export type LiveStatus = "lobby" | "active" | "ended";
export type LiveTier = { points: number; count: number };
export type LiveHour = { start: number; meets: number };
export type LiveSnapshot = {
  status: LiveStatus;
  players: number;
  meets: number;
  top3: LiveTier[];
  recentHours: LiveHour[];
};

const HOUR_MS = 3_600_000;

// Public and anonymous: never pass names through, even if the cache holds them.
export function buildLiveSnapshot(
  publicValue: unknown,
  stats: Record<string, string | number> | null,
  now: number,
  hourCount = 8
): LiveSnapshot {
  let state: unknown = publicValue;
  if (typeof state === "string") {
    try {
      state = JSON.parse(state);
    } catch {
      state = null;
    }
  }
  const record = state && typeof state === "object" ? (state as Record<string, unknown>) : {};
  const status: LiveStatus = record.status === "active" || record.status === "ended"
    ? record.status
    : "lobby";

  const top3 = (Array.isArray(record.top3) ? record.top3 : [])
    .flatMap((tier) => {
      const points = Number((tier as { points?: unknown })?.points);
      const count = Number((tier as { count?: unknown })?.count);
      return Number.isFinite(points) && Number.isFinite(count) && count > 0
        ? [{ points, count }]
        : [];
    })
    .slice(0, 3);

  const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
  const recentHours: LiveHour[] = [];
  for (let index = hourCount - 1; index >= 0; index -= 1) {
    const start = currentHour - index * HOUR_MS;
    const bucket = new Date(start).toISOString().slice(0, 13);
    recentHours.push({ start, meets: Number(stats?.[`hour:${bucket}`] ?? 0) || 0 });
  }

  return {
    status,
    players: Number(stats?.players ?? 0) || 0,
    meets: Number(stats?.meets ?? 0) || 0,
    top3,
    recentHours,
  };
}
