import type { ScanOutcome } from "@/lib/scan-types";

export function ScanResultSummary({
  outcome,
  secondsLeft = 0,
}: {
  outcome: ScanOutcome;
  secondsLeft?: number;
}) {
  if (outcome.result === "pending") {
    return (
      <>
        <p className="eyebrow">Your scan is in</p>
        <h1>Now have {outcome.other.name} scan you back.</h1>
        <p className="scan-countdown">
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left to confirm
        </p>
        <blockquote>{outcome.icebreaker}</blockquote>
      </>
    );
  }
  if (outcome.result === "confirmed") {
    return (
      <>
        <p className="eyebrow">Connection confirmed</p>
        <h1>You met {outcome.other.name}!</h1>
        <p className="scan-points">+1 point for both of you</p>
        <blockquote>{outcome.icebreaker}</blockquote>
      </>
    );
  }
  if (outcome.result === "already_met") {
    return (
      <>
        <p className="eyebrow">Already connected</p>
        <h1>You've already met {outcome.other.name}.</h1>
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">Couldn't scan that</p>
      <p className="scan-error" role="alert">{outcome.message}</p>
    </>
  );
}