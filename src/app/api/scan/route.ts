import { hmacBase64Url, verifySessionSignature } from "@/lib/identity";
import { getRedis, redisConfigured } from "@/lib/redis";
import { verifyPlayerQrToken } from "@/lib/rotating-qr";
import { getIcebreakerQuestion } from "@/lib/scan-utils";
import { applyPlayerScan, PENDING_SCAN_MS } from "@/lib/scan-service";

export const runtime = "nodejs";

type PublicState = { status?: string };

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function readGameStatus(value: unknown): string | undefined {
  if (typeof value === "string") {
    try {
      return (JSON.parse(value) as PublicState).status;
    } catch {
      return undefined;
    }
  }
  return value && typeof value === "object"
    ? (value as PublicState).status
    : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const scannerId = request.headers.get("x-player-id") ?? "";
  const sessionSignature = request.headers.get("x-session-sig") ?? "";
  const secret = process.env.QR_SECRET ?? "";
  const payload = await request.json().catch(() => null);
  const token = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).token
    : null;
  const targetMatch = typeof token === "string"
    ? token.match(/(?:^|\/m\/)([A-Za-z0-9]{10})\.(\d+)\.([A-Za-z0-9_-]{12})\/?$/)
    : null;

  if (!/^[A-Za-z0-9]{10}$/.test(scannerId) || !sessionSignature || !secret) {
    return json({ error: "Your session is not valid." }, 401);
  }
  if (!(await verifySessionSignature(scannerId, sessionSignature, secret))) {
    return json({ error: "Your session is not valid." }, 401);
  }
  if (!targetMatch) {
    return json({ error: "That doesn't look like a Critical Mixer code." }, 400);
  }

  const targetId = targetMatch[1];
  if (scannerId === targetId) {
    return json({ error: "That's your own code. Find someone else to meet." }, 400);
  }

  const targetToken = `${targetMatch[1]}.${targetMatch[2]}.${targetMatch[3]}`;
  const targetKey = await hmacBase64Url(secret, targetId);
  const now = Date.now();
  if (!(await verifyPlayerQrToken(targetToken, targetId, targetKey, now))) {
    return json({ error: "That code expired. Ask them to hold it up again." }, 410);
  }

  if (!redisConfigured) {
    return json({ error: "The game is not ready yet. Please try again shortly." }, 503);
  }

  try {
    const reads = await getRedis()
      .pipeline()
      .get<PublicState>("cmx:public")
      .hget<string>(`cmx:player:${scannerId}`, "name")
      .hget<string>(`cmx:player:${targetId}`, "name")
      .exec();
    const status = readGameStatus(reads[0]);
    const scannerName = reads[1];
    const targetName = reads[2];

    if (status !== "active") {
      return json({ error: "Scanning is only open while the game is active." }, 409);
    }
    if (!scannerName) {
      return json({ error: "Your player account could not be found." }, 401);
    }
    if (!targetName) {
      return json({ error: "That player could not be found." }, 404);
    }

    const transition = await applyPlayerScan(scannerId, targetId, now);
    const other = { id: targetId, name: targetName };
    const icebreaker = getIcebreakerQuestion(scannerId, targetId);

    if (transition.result === "pending") {
      return json({
        result: "pending",
        other,
        icebreaker,
        expiresAt: transition.scannedAt + PENDING_SCAN_MS,
      }, 200);
    }
    if (transition.result === "confirmed") {
      return json({ result: "confirmed", other, points: 1, icebreaker }, 200);
    }
    return json({ result: "already_met", other }, 200);
  } catch {
    return json({ error: "The game is temporarily unavailable. Please try again." }, 503);
  }
}