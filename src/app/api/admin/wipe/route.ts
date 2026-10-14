import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";
const DELETE_BATCH_SIZE = 200;

export async function POST(request: Request): Promise<Response> {
  if (!isValidAdminKey(request.headers.get("x-admin-key"))) {
    return adminJson({ error: "Unauthorized." }, 401);
  }
  if (!redisConfigured) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  const payload = await request.json().catch(() => null);
  const confirmation = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).confirm
    : null;
  if (confirmation !== "WIPE") {
    return adminJson({ error: "Type WIPE to confirm deletion of Critical Mixer data." }, 400);
  }

  try {
    const redis = getRedis();
    let cursor = "0";
    let deleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: "cmx:*",
        count: DELETE_BATCH_SIZE,
      });
      cursor = String(nextCursor);
      for (let offset = 0; offset < keys.length; offset += DELETE_BATCH_SIZE) {
        const batch = keys.slice(offset, offset + DELETE_BATCH_SIZE);
        if (batch.length > 0) deleted += await redis.del(...batch);
      }
    } while (cursor !== "0");

    return adminJson({ deleted }, 200);
  } catch {
    return adminJson({ error: "The game data could not be fully wiped. Check Redis before retrying." }, 503);
  }
}