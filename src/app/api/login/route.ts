import { loginPlayerByName, PlayerServiceUnavailableError } from "@/lib/players";
import { redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const input = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name || name.length > 100) {
    return json({ error: "Enter your name to log back in." }, 400);
  }

  if (!redisConfigured || !process.env.QR_SECRET) {
    return json({ error: "The game is not ready yet. Please try again shortly." }, 503);
  }

  try {
    const session = await loginPlayerByName(name);
    if (!session) {
      return json({ error: "We couldn't find that player. Check the spelling or join as new." }, 404);
    }
    return json({ session }, 200);
  } catch (error) {
    if (error instanceof PlayerServiceUnavailableError) {
      return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
    }
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}
