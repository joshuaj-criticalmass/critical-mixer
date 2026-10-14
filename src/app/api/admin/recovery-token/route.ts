import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { hmacBase64Url } from "@/lib/identity";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";
const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  if (!isValidAdminKey(request.headers.get("x-admin-key"))) {
    return adminJson({ error: "Unauthorized." }, 401);
  }
  const secret = process.env.QR_SECRET ?? "";
  if (!redisConfigured || !secret) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  const payload = await request.json().catch(() => null);
  const playerId = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).playerId
    : null;
  if (typeof playerId !== "string" || !/^[A-Za-z0-9]{10}$/.test(playerId)) {
    return adminJson({ error: "A valid player ID is required." }, 400);
  }

  try {
    const player = await getRedis().hgetall<{ name?: string }>(`cmx:player:${playerId}`);
    if (!player?.name) return adminJson({ error: "Player not found." }, 404);

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const unsigned = `${playerId}.${expiresAt}`;
    const signature = await hmacBase64Url(secret, unsigned);
    const token = `${unsigned}.${signature}`;
    const origin = new URL(request.url).origin;
    return adminJson({
      name: player.name,
      token,
      expiresAt,
      url: `${origin}/r/${token}`,
    }, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}