import { verifySessionSignature } from "@/lib/identity";
import { getRedis, redisConfigured } from "@/lib/redis";
import { normalizeStoredPlayerName, parseScoredMembers, readHashField } from "@/lib/redis-shapes";

export const runtime = "nodejs";

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const playerId = request.headers.get("x-player-id") ?? "";
  const sessionSignature = request.headers.get("x-session-sig") ?? "";
  const secret = process.env.QR_SECRET ?? "";

  if (!/^[A-Za-z0-9]{10}$/.test(playerId) || !sessionSignature || !secret) {
    return json({ error: "Your session is not valid." }, 401);
  }
  if (!(await verifySessionSignature(playerId, sessionSignature, secret))) {
    return json({ error: "Your session is not valid." }, 401);
  }
  if (!redisConfigured) {
    return json({ error: "The game is not ready yet. Please try again shortly." }, 503);
  }

  try {
    const redis = getRedis();
    const members = parseScoredMembers(
      await redis.zrange<(string | number | { member: string; score: number })[]>(
        `cmx:met:${playerId}`,
        0,
        -1,
        { rev: true, withScores: true }
      )
    );

    if (members.length === 0) return json({ people: [] }, 200);

    const names = await redis.hmget<Record<string, unknown>>(
      "cmx:names",
      ...members.map(({ member }) => member)
    );
    const people = members.flatMap(({ member, score }, index) => {
      const name = normalizeStoredPlayerName(readHashField(names, member, index));
      return name ? [{ id: member, name, metAt: score }] : [];
    });

    return json({ people }, 200);
  } catch {
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}