import { icebreakers } from "./icebreakers.ts";

const playerTokenPattern = /^([A-Za-z0-9]{10})\.(\d+)\.([A-Za-z0-9_-]{12})$/;

export function extractPlayerQrToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (playerTokenPattern.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed, "https://critical-mixer.invalid");
    const match = url.pathname.match(/^\/m\/([^/]+)\/?$/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    return playerTokenPattern.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function getPairKey(firstPlayerId: string, secondPlayerId: string): string {
  const [lowId, highId] = [firstPlayerId, secondPlayerId].sort();
  return `cmx:pair:${lowId}:${highId}`;
}

export function getIcebreakerQuestion(firstPlayerId: string, secondPlayerId: string): string {
  const pair = [firstPlayerId, secondPlayerId].sort().join(":");
  let hash = 2_166_136_261;
  for (let index = 0; index < pair.length; index += 1) {
    hash ^= pair.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return icebreakers[(hash >>> 0) % icebreakers.length];
}