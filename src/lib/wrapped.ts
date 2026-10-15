import { buildRevealedLeaderboard, type LeaderboardTier, type Winner } from "./leaderboard.ts";
import type { ScoredMember } from "./redis-shapes.ts";

export type WrappedHour = {
  bucket: string;
  label: string;
  meets: number;
};

export type WrappedData = {
  players: number;
  meets: number;
  peakHour: WrappedHour | null;
  hourly: WrappedHour[];
  top3: LeaderboardTier[];
  winners: Winner[];
};

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}${suffix}`;
}

function formatBucket(timestamp: number, meets: number): WrappedHour {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const nextHour = Number(formatter.formatToParts(new Date(timestamp + 60 * 60 * 1000))
    .find((part) => part.type === "hour")?.value ?? (hour + 1) % 24);
  const bucket = date.toISOString().slice(0, 13);

  return {
    bucket,
    label: `${weekday}, ${formatHour(hour)}–${formatHour(nextHour)}`,
    meets,
  };
}

function buildHourlySeries(
  stats: Record<string, string | number>,
  startedAt?: number,
  endedAt?: number
): WrappedHour[] {
  if (
    Number.isFinite(startedAt) &&
    Number.isFinite(endedAt) &&
    (endedAt as number) >= (startedAt as number)
  ) {
    const firstHour = Math.floor((startedAt as number) / 3_600_000) * 3_600_000;
    const lastHour = Math.floor((endedAt as number) / 3_600_000) * 3_600_000;
    if (lastHour - firstHour <= 96 * 3_600_000) {
      const hours: WrappedHour[] = [];
      for (let hour = firstHour; hour <= lastHour; hour += 3_600_000) {
        const bucket = new Date(hour).toISOString().slice(0, 13);
        hours.push(formatBucket(hour, Number(stats[`hour:${bucket}`] ?? 0)));
      }
      return hours;
    }
  }

  return Object.entries(stats)
    .filter(([key]) => key.startsWith("hour:"))
    .map(([key, meets]) => formatBucket(Date.parse(`${key.slice(5)}:00:00Z`), Number(meets)))
    .filter((hour) => Number.isFinite(hour.meets))
    .sort((left, right) => left.bucket.localeCompare(right.bucket));
}

export function buildWrappedData(
  stats: Record<string, string | number>,
  scores: ScoredMember[],
  names: Record<string, string>,
  startedAt?: number,
  endedAt?: number
): WrappedData {
  const leaderboard = buildRevealedLeaderboard(scores, names);
  const hourly = buildHourlySeries(stats, startedAt, endedAt);
  const peakHour = hourly.reduce<WrappedHour | null>(
    (peak, hour) => hour.meets > 0 && (!peak || hour.meets > peak.meets) ? hour : peak,
    null
  );

  return {
    players: Number(stats.players ?? 0),
    meets: Number(stats.meets ?? 0),
    peakHour,
    hourly,
    top3: leaderboard.top3,
    winners: leaderboard.winners,
  };
}