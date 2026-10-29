"use client";

import { useEffect, useRef } from "react";
import type { PlayerSession } from "@/lib/identity";
import type { ScanOutcome } from "@/lib/scan-types";

const POLL_MS = 4_000;

// While waiting for a scan-back, watch for the other player completing the meet.
export function useScanBackConfirmation(
  session: PlayerSession | null,
  outcome: ScanOutcome | null,
  onConfirmed: (confirmed: Extract<ScanOutcome, { result: "confirmed" }>) => void
): void {
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (!session || outcome?.result !== "pending") return;
    const pending = outcome;
    let stopped = false;

    async function check() {
      if (stopped || document.visibilityState !== "visible" || Date.now() > pending.expiresAt) return;
      try {
        const response = await fetch("/api/met", {
          headers: { "x-player-id": session!.playerId, "x-session-sig": session!.sessionSig },
          cache: "no-store",
        });
        if (!response.ok) return;
        const { people } = (await response.json()) as { people: { id: string }[] };
        if (!stopped && people.some((person) => person.id === pending.other.id)) {
          stopped = true;
          onConfirmedRef.current({
            result: "confirmed",
            other: pending.other,
            points: 1,
            icebreaker: pending.icebreaker,
          });
        }
      } catch {
        // Try again on the next tick.
      }
    }

    const interval = window.setInterval(() => void check(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [outcome, session]);
}
