import { getRedis, redisConfigured } from "./redis";
import {
  createPlayerId,
  createPlayerSession,
  createRecoveryCode,
  normalizeNameForMatch,
  type Company,
  type PlayerSession,
} from "./identity";

const qrSecret = process.env.QR_SECRET ?? "";
const recoveryCodeKey = (code: string) => `cmx:recovery:${code}`;
const playerKey = (id: string) => `cmx:player:${id}`;

type StoredPlayer = {
  name?: string;
  company?: Company;
  recoveryCode?: string;
};

export class PlayerServiceUnavailableError extends Error {}

function ensureConfigured(): void {
  if (!redisConfigured || !qrSecret) {
    throw new PlayerServiceUnavailableError();
  }
}

export async function joinPlayer(name: string, company: Company): Promise<PlayerSession> {
  ensureConfigured();
  const redis = getRedis();

  const id = createPlayerId();
  const createdAt = Date.now();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createRecoveryCode();
    const claimed = await redis.set(recoveryCodeKey(code), id, { nx: true });
    if (claimed !== "OK") continue;

    try {
      await redis
        .multi()
        .hset(playerKey(id), {
          name,
          company,
          points: 0,
          meetCount: 0,
          recoveryCode: code,
          createdAt,
        })
        .hset("cmx:names", { [id]: `${name}|${company}` })
        .zadd("cmx:scores", { score: 0, member: id })
        .hincrby("cmx:stats", "players", 1)
        .hincrby("cmx:stats", `players:${company}`, 1)
        .exec();

      return await createPlayerSession(id, name, company, code, qrSecret);
    } catch {
      await redis.del(recoveryCodeKey(code)).catch(() => undefined);
      throw new PlayerServiceUnavailableError();
    }
  }

  throw new PlayerServiceUnavailableError();
}

export async function recoverPlayer(
  name: string,
  code: string,
  ipKey: string
): Promise<PlayerSession | null> {
  ensureConfigured();
  const redis = getRedis();

  const rateLimitKey = `cmx:ratelimit:${ipKey}`;
  const failures = Number((await redis.get<string>(rateLimitKey)) ?? 0);
  if (failures >= 5) throw new RecoveryRateLimitError();

  const id = await redis.get<string>(recoveryCodeKey(code));
  const record = id ? ((await redis.hgetall<StoredPlayer>(playerKey(id))) ?? {}) : {};

  if (
    !id ||
    !record.name ||
    !record.company ||
    !record.recoveryCode ||
    normalizeNameForMatch(record.name) !== normalizeNameForMatch(name)
  ) {
    const nextFailures = await redis.incr(rateLimitKey);
    if (nextFailures === 1) await redis.expire(rateLimitKey, 600);
    if (nextFailures >= 5) throw new RecoveryRateLimitError();
    return null;
  }

  return createPlayerSession(
    id,
    record.name,
    record.company,
    record.recoveryCode,
    qrSecret
  );
}

export class RecoveryRateLimitError extends Error {}