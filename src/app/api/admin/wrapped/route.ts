import { adminJson, isValidAdminKey } from "@/lib/admin-auth";
import { buildWrappedData, type WrappedData } from "@/lib/wrapped";
import { parseScoredMembers } from "@/lib/redis-shapes";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

type PublicState = {
  status?: string;
  startedAt?: number | null;
  endedAt?: number | null;
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

function parseWrappedData(value: unknown): WrappedData | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as WrappedData;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value as WrappedData : null;
}

export async function GET(request: Request): Promise<Response> {
  if (!isValidAdminKey(request.headers.get("x-admin-key"))) {
    return adminJson({ error: "Unauthorized." }, 401);
  }
  if (!redisConfigured) {
    return adminJson({ error: "The game is not ready yet." }, 503);
  }

  try {
    const redis = getRedis();
    const state = parsePublicState(await redis.get<PublicState>("cmx:public"));
    if (state.status !== "ended") {
      return adminJson({ error: "The reveal is available after the game ends." }, 409);
    }

    const cached = parseWrappedData(await redis.get<WrappedData>("cmx:wrapped"));
    if (cached) return adminJson(cached, 200);

    const [stats, scoreRows, names] = await redis
      .pipeline()
      .hgetall<Record<string, string | number>>("cmx:stats")
      .zrange<(string | number | { member: string; score: number })[]>(
        "cmx:scores",
        0,
        -1,
        { rev: true, withScores: true }
      )
      .hgetall<Record<string, string>>("cmx:names")
      .exec();

    const wrapped = buildWrappedData(
      stats ?? {},
      parseScoredMembers(scoreRows),
      names ?? {},
      state.startedAt ?? undefined,
      state.endedAt ?? undefined
    );

    await redis.set("cmx:wrapped", JSON.stringify(wrapped), { nx: true });
    const finalValue = parseWrappedData(await redis.get<WrappedData>("cmx:wrapped"));
    return adminJson(finalValue ?? wrapped, 200);
  } catch {
    return adminJson({ error: "The reveal data is temporarily unavailable." }, 503);
  }
}