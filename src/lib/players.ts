import { getRedis, redisConfigured } from "./redis";
import {
  createPlayerId,
  createPlayerSession,
  formatPlayerName,
  type PlayerNameParts,
  type PlayerSession,
} from "./identity";
import { findExactName, findSimilarNames, nameKey, type NamedPlayer } from "./name-match";
import { normalizeStoredPlayerName } from "./redis-shapes";

const qrSecret = process.env.QR_SECRET ?? "";
const playerKey = (id: string) => `cmx:player:${id}`;
const nameIndexKey = (name: string) => `cmx:name:${nameKey(name)}`;

export type JoinResult =
  | { result: "joined"; session: PlayerSession }
  | { result: "exists"; name: string }
  | { result: "similar"; suggestions: string[] };

export class PlayerServiceUnavailableError extends Error {}

function ensureConfigured(): void {
  if (!redisConfigured || !qrSecret) {
    throw new PlayerServiceUnavailableError();
  }
}

async function loadPlayers(): Promise<NamedPlayer[]> {
  const names = (await getRedis().hgetall<Record<string, string>>("cmx:names")) ?? {};
  return Object.entries(names).flatMap(([id, value]) => {
    const name = normalizeStoredPlayerName(value);
    return name ? [{ id, name }] : [];
  });
}

// Joining with a name that's taken or close to one asks the player first;
// `allowSimilar` skips only the "did you mean" step, never the exact-name block.
export async function joinPlayer(parts: PlayerNameParts, allowSimilar: boolean): Promise<JoinResult> {
  ensureConfigured();
  const redis = getRedis();
  const name = formatPlayerName(parts);
  const players = await loadPlayers();

  const existing = findExactName(name, players);
  if (existing) return { result: "exists", name: existing.name };

  if (!allowSimilar) {
    const suggestions = findSimilarNames(name, players).map((player) => player.name);
    if (suggestions.length > 0) return { result: "similar", suggestions };
  }

  const id = createPlayerId();
  const claimed = await redis.set(nameIndexKey(name), id, { nx: true });
  if (claimed !== "OK") return { result: "exists", name };

  try {
    await redis
      .multi()
      .hset(playerKey(id), {
        name,
        firstName: parts.firstName,
        middleName: parts.middleName,
        lastName: parts.lastName,
        points: 0,
        meetCount: 0,
        createdAt: Date.now(),
      })
      .hset("cmx:names", { [id]: name })
      .zadd("cmx:scores", { score: 0, member: id })
      .hincrby("cmx:stats", "players", 1)
      .exec();
  } catch {
    await redis.del(nameIndexKey(name)).catch(() => undefined);
    throw new PlayerServiceUnavailableError();
  }

  return { result: "joined", session: await createPlayerSession(id, name, qrSecret) };
}

export async function loginPlayerByName(name: string): Promise<PlayerSession | null> {
  ensureConfigured();
  const redis = getRedis();
  const indexedId = await redis.get<string>(nameIndexKey(name));
  const match = indexedId
    ? { id: indexedId, name: normalizeStoredPlayerName(await redis.hget("cmx:names", indexedId)) }
    : findExactName(name, await loadPlayers());

  if (!match?.name) return null;
  return createPlayerSession(match.id, match.name, qrSecret);
}
