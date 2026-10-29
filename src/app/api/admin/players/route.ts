import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { normalizeStoredPlayerName, readHashField } from "@/lib/redis-shapes";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!isValidAdminKey(request.headers.get("x-admin-key"))) {
    return adminJson({ error: "Unauthorized." }, 401);
  }
  if (!redisConfigured) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  try {
    const redis = getRedis();
    const names = (await redis.hgetall<Record<string, string>>("cmx:names")) ?? {};
    const roster = Object.entries(names).flatMap(([id, rawName]) => {
      const name = normalizeStoredPlayerName(rawName);
      return name ? [{ id, name }] : [];
    });
    if (roster.length === 0) return adminJson({ players: [] }, 200);

    const pipeline = redis.pipeline();
    for (const player of roster) {
      pipeline.hmget<Record<string, unknown>>(`cmx:player:${player.id}`, "points", "meetCount", "createdAt");
    }
    const records = await pipeline.exec();
    const players = roster.map((player, index) => ({
      ...player,
      points: Number(readHashField(records[index], "points", 0) ?? 0),
      meetCount: Number(readHashField(records[index], "meetCount", 1) ?? 0),
      createdAt: Number(readHashField(records[index], "createdAt", 2) ?? 0),
    }));

    return adminJson({ players }, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}
