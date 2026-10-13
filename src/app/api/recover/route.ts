import { hmacBase64Url, normalizePlayerName, normalizeRecoveryCode } from "@/lib/identity";
import {
  recoverPlayer,
  RecoveryRateLimitError,
  PlayerServiceUnavailableError,
} from "@/lib/players";
import { redisConfigured } from "@/lib/redis";

export const runtime = "nodejs";

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => null);
  const input = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : {};
  const name = normalizePlayerName(input.name);
  const code = normalizeRecoveryCode(input.code);

  if (!name || !code) {
    return json({ error: "Enter your name and recovery code." }, 400);
  }

  const secret = process.env.QR_SECRET;
  if (!redisConfigured || !secret) {
    return json({ error: "The game is not ready yet. Please try again shortly." }, 503);
  }

  try {
    const ipKey = await hmacBase64Url(secret, `recovery-ip:${getClientIp(request)}`);
    const session = await recoverPlayer(name, code, ipKey);
    if (!session) {
      return json({ error: "That name and recovery code did not match." }, 401);
    }
    return json({ session, recoveryCode: session.recoveryCode }, 200);
  } catch (error) {
    if (error instanceof RecoveryRateLimitError) {
      return json(
        { error: "Too many attempts. Try again in 10 minutes." },
        429,
        { "Retry-After": "600" }
      );
    }
    if (error instanceof PlayerServiceUnavailableError) {
      return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
    }
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}