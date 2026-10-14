import type { PlayerSession } from "./identity.ts";
import type { ScanOutcome } from "./scan-types.ts";

type ScanApiResponse = {
  result?: "pending" | "confirmed" | "already_met";
  other?: { id: string; name: string };
  icebreaker?: string;
  expiresAt?: number;
  points?: 1;
  error?: string;
};

export async function submitScan(
  token: string,
  session: PlayerSession
): Promise<ScanOutcome> {
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-player-id": session.playerId,
        "x-session-sig": session.sessionSig,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const result = (await response.json()) as ScanApiResponse;

    if (!response.ok) {
      return {
        result: "error",
        message: typeof result.error === "string"
          ? result.error
          : "We couldn't process that code. Please try again.",
      };
    }

    if (result.result === "pending" && result.other && result.icebreaker && result.expiresAt) {
      return {
        result: "pending",
        other: result.other,
        icebreaker: result.icebreaker,
        expiresAt: result.expiresAt,
      };
    }
    if (result.result === "confirmed" && result.other && result.icebreaker) {
      return {
        result: "confirmed",
        other: result.other,
        points: 1,
        icebreaker: result.icebreaker,
      };
    }
    if (result.result === "already_met" && result.other) {
      return { result: "already_met", other: result.other };
    }

    return { result: "error", message: "We couldn't process that code. Please try again." };
  } catch {
    return {
      result: "error",
      message: "We couldn't reach the game. Check your connection and try again.",
    };
  }
}