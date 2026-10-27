import { normalizeNameParts } from "@/lib/identity";
import { joinPlayer, PlayerServiceUnavailableError } from "@/lib/players";
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
  const nameParts = normalizeNameParts(input);

  if (!nameParts) {
    return json({ error: "Enter your first and last name to join." }, 400);
  }

  if (!redisConfigured || !process.env.QR_SECRET) {
    return json({ error: "The game is not ready yet. Please try again shortly." }, 503);
  }

  try {
    const session = await joinPlayer(nameParts);
    return json({ session, recoveryCode: session.recoveryCode }, 201);
  } catch (error) {
    if (error instanceof PlayerServiceUnavailableError) {
      return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
    }
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}