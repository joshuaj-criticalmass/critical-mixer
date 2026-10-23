import { buildLiveSnapshot } from "@/lib/live";
import { getRedis, redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!redisConfigured) {
    return Response.json(
      { error: "The game is not ready yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const [publicValue, stats] = await getRedis()
      .pipeline()
      .get("cmx:public")
      .hgetall<Record<string, string | number>>("cmx:stats")
      .exec();

    return Response.json(buildLiveSnapshot(publicValue, stats, Date.now()), {
      // Short CDN cache so a room full of phones shares one Redis read.
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25" },
    });
  } catch {
    return Response.json(
      { error: "The game is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
