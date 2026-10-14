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

  const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase("en-GB") ?? "";
  if (query.length < 2) return adminJson({ players: [] }, 200);

  try {
    const redis = getRedis();
    const names = (await redis.hgetall<Record<string, string>>("cmx:names")) ?? {};
    const matches = Object.entries(names)
      .map(([id, rawName]) => ({ id, name: normalizeStoredPlayerName(rawName) }))
      .filter((player): player is { id: string; name: string } => Boolean(player.name?.toLocaleLowerCase("en-GB").includes(query)))
      .slice(0, 20);

    if (matches.length === 0) return adminJson({ players: [] }, 200);

    const pipeline = redis.pipeline();
    for (const player of matches) {
      pipeline.hmget<Record<string, unknown>>(`cmx:player:${player.id}`, "points", "createdAt");
    }
    const records = await pipeline.exec();
    const players = matches.map((player, index) => ({
      ...player,
      points: Number(readHashField(records[index], "points", 0) ?? 0),
      createdAt: Number(readHashField(records[index], "createdAt", 1) ?? 0),
    }));

    return adminJson({ players }, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}