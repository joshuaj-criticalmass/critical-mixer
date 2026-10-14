import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { normalizeStoredPlayerName, parseScoredMembers } from "@/lib/redis-shapes";
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
    const [publicState, stats, scoreRows, names] = await redis
      .pipeline()
      .get<Record<string, unknown>>("cmx:public")
      .hgetall<Record<string, string | number>>("cmx:stats")
      .zrange<(string | number | { member: string; score: number })[]>(
        "cmx:scores",
        0,
        99,
        { rev: true, withScores: true }
      )
      .hgetall<Record<string, string>>("cmx:names")
      .exec();

    const scoredPlayers = parseScoredMembers(scoreRows);
    const tiers: { points: number; count: number; players: { id: string; name: string }[] }[] = [];
    for (const player of scoredPlayers) {
      let tier = tiers.find((item) => item.points === player.score);
      if (!tier) {
        if (tiers.length === 3) continue;
        tier = { points: player.score, count: 0, players: [] };
        tiers.push(tier);
      }
      tier.count += 1;
      const name = normalizeStoredPlayerName(names?.[player.member]);
      if (name) tier.players.push({ id: player.member, name });
    }

    for (const tier of tiers) {
      tier.count = await redis.zcount("cmx:scores", tier.points, tier.points);
    }

    return adminJson({
      status: typeof publicState?.status === "string" ? publicState.status : "lobby",
      players: Number(stats?.players ?? 0),
      meets: Number(stats?.meets ?? 0),
      top3: tiers,
    }, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}