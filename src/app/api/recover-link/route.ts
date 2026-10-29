import { adminJson, secureEqual } from "@/lib/admin-auth";
import { createPlayerSession, hmacBase64Url } from "@/lib/identity";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

type StoredPlayer = { name?: string; firstName?: string };

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.QR_SECRET ?? "";
  if (!redisConfigured || !secret) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  const payload = await request.json().catch(() => null);
  const token = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).token
    : null;
  if (typeof token !== "string") return adminJson({ error: "Invalid recovery link." }, 400);

  const [playerId, expiresValue, signature, extra] = token.split(".");
  const expiresAt = Number(expiresValue);
  if (
    extra !== undefined ||
    !/^[A-Za-z0-9]{10}$/.test(playerId ?? "") ||
    !Number.isSafeInteger(expiresAt) ||
    !signature ||
    expiresAt <= Date.now()
  ) {
    return adminJson({ error: "This recovery link is invalid or expired." }, 401);
  }

  try {
    const expected = await hmacBase64Url(secret, `${playerId}.${expiresAt}`);
    if (!secureEqual(expected, signature)) {
      return adminJson({ error: "This recovery link is invalid or expired." }, 401);
    }

    const redis = getRedis();
    const used = await redis.set(`cmx:recover-used:${signature}`, playerId, {
      nx: true,
      ex: Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)),
    });
    if (used !== "OK") return adminJson({ error: "This recovery link has already been used." }, 409);

    const player = await redis.hgetall<StoredPlayer>(`cmx:player:${playerId}`);
    if (!player?.name) {
      return adminJson({ error: "This player account could not be found." }, 404);
    }

    const session = await createPlayerSession(playerId, player.name, secret, player.firstName);
    return adminJson({ session }, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}