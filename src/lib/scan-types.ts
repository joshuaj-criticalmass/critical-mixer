export type ScanOutcome =
  | {
      result: "pending";
      other: { id: string; name: string };
      icebreaker: string;
      expiresAt: number;
    }
  | {
      result: "confirmed";
      other: { id: string; name: string };
      points: 1;
      icebreaker: string;
    }
  | { result: "already_met"; other: { id: string; name: string } }
  | { result: "error"; message: string };