import { verifySessionSignature } from "@/lib/identity";
import { buildRevealedLeaderboard } from "@/lib/leaderboard";
import { getRedis, redisConfigured } from "@/lib/redis";
import { normalizeStoredPlayerName, parseScoredMembers, readHashField } from "@/lib/redis-shapes";

export const runtime = "nodejs";

type GameStatus = "lobby" | "active" | "ended";
type LeaderboardTier = { points: number; count: number; players?: { id: string; name: string }[] };
type PublicState = { status?: string; top3?: LeaderboardTier[] };
const PENDING_WINDOW_MS = 10 * 60 * 1000;

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
    const now = Date.now();
    const playerKey = `cmx:player:${playerId}`;
    const pendingKey = `cmx:pending:${playerId}`;
    const [publicValue, playerValues, pendingValues, playerExists] = await redis
      .pipeline()
      .get<PublicState>("cmx:public")
      .hmget<Record<string, unknown>>(playerKey, "points", "meetCount")
      .zrange<(string | number | { member: string; score: number })[]>(
        pendingKey,
        `(${now - PENDING_WINDOW_MS}`,
        "+inf",
        { byScore: true, withScores: true }
      )
      .exists(playerKey)
      .exec();

    // A valid signature for a wiped player: tell the client to drop its session.
    if (!playerExists) {
      return json({ error: "This game has been reset. Join again to play." }, 410);
    }

    const publicState = typeof publicValue === "string"
      ? (JSON.parse(publicValue) as PublicState)
      : publicValue;
    const rawStatus = publicState?.status;
    const status: GameStatus = rawStatus === "active" || rawStatus === "ended"
      ? rawStatus
      : "lobby";
    const pendingIds = parseScoredMembers(pendingValues);
    let pending: { id: string; name: string; scannedAt: number }[] = [];

    if (pendingIds.length > 0) {
      const pendingNames = await redis.hmget<Record<string, unknown>>(
        "cmx:names",
        ...pendingIds.map(({ member }) => member)
      );
      pending = pendingIds.flatMap(({ member, score }, index) => {
        const name = normalizeStoredPlayerName(
          readHashField(pendingNames, member, index)
        );
        return name ? [{ id: member, name, scannedAt: score }] : [];
      });
    }

    let top3: LeaderboardTier[] = Array.isArray(publicState?.top3)
      ? publicState.top3.filter((tier) => Number.isFinite(tier.points) && Number.isFinite(tier.count))
      : [];
    let winners: { name: string; points: number }[] | undefined;

    if (status === "ended") {
      const [scores, names] = await redis
        .pipeline()
        .zrange<(string | number | { member: string; score: number })[]>(
          "cmx:scores",
          0,
          -1,
          { rev: true, withScores: true }
        )
        .hgetall<Record<string, string>>("cmx:names")
        .exec();
      const revealed = buildRevealedLeaderboard(parseScoredMembers(scores), names ?? {});
      top3 = revealed.top3;
      winners = revealed.winners;
    }

    return json({
      serverTime: now,
      status,
      me: {
        points: Number(readHashField(playerValues, "points", 0) ?? 0),
        meetCount: Number(readHashField(playerValues, "meetCount", 1) ?? 0),
      },
      top3,
      pending,
      ...(winners ? { winners } : {}),
    }, 200);
  } catch {
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}