import { verifySessionSignature } from "@/lib/identity";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

type GameStatus = "lobby" | "active" | "ended";

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
    const publicState = await getRedis().get<{ status?: string }>("cmx:public");
    const rawStatus = publicState && typeof publicState === "object"
      ? publicState.status
      : undefined;
    const status: GameStatus = rawStatus === "active" || rawStatus === "ended"
      ? rawStatus
      : "lobby";

    return json({ serverTime: Date.now(), status }, 200);
  } catch {
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}