import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

type GameStatus = "lobby" | "active" | "ended";
type PublicState = {
  status?: GameStatus;
  startedAt?: number | null;
  endedAt?: number | null;
  top3?: { points: number; count: number }[];
  updatedAt?: number;
};

function parsePublicState(value: unknown): PublicState {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PublicState;
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value as PublicState : {};
}

export async function POST(request: Request): Promise<Response> {
  if (!isValidAdminKey(request.headers.get("x-admin-key"))) {
    return adminJson({ error: "Unauthorized." }, 401);
  }
  if (!redisConfigured) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  const payload = await request.json().catch(() => null);
  const requestedStatus = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).status
    : null;
  if (requestedStatus !== "active" && requestedStatus !== "ended") {
    return adminJson({ error: "Status must be active or ended." }, 400);
  }

  try {
    const redis = getRedis();
    const current = parsePublicState(await redis.get<PublicState>("cmx:public"));
    const currentStatus = current.status ?? "lobby";
    const allowed = requestedStatus === "active"
      ? currentStatus === "lobby" || currentStatus === "ended"
      : currentStatus === "active";

    if (!allowed) {
      return adminJson({ error: `Cannot move the game from ${currentStatus} to ${requestedStatus}.` }, 409);
    }

    const now = Date.now();
    const next: PublicState = {
      ...current,
      status: requestedStatus,
      startedAt: requestedStatus === "active" ? now : current.startedAt ?? null,
      endedAt: requestedStatus === "ended" ? now : null,
      top3: current.top3 ?? [],
      updatedAt: now,
    };
    await redis.set("cmx:public", JSON.stringify(next));
    return adminJson(next, 200);
  } catch {
    return adminJson({ error: "The game is temporarily unavailable." }, 503);
  }
}