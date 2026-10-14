export type ScoredMember = { member: string; score: number };

export function parseScoredMembers(value: unknown): ScoredMember[] {
  if (!Array.isArray(value)) return [];

  if (value.every((item) => item && typeof item === "object" && "member" in item && "score" in item)) {
    return value.flatMap((item) => {
      const member = (item as { member?: unknown }).member;
      const score = Number((item as { score?: unknown }).score);
      return typeof member === "string" && Number.isFinite(score)
        ? [{ member, score }]
        : [];
    });
  }

  const members: ScoredMember[] = [];
  for (let index = 0; index + 1 < value.length; index += 2) {
    const member = value[index];
    const score = Number(value[index + 1]);
    if (typeof member === "string" && Number.isFinite(score)) {
      members.push({ member, score });
    }
  }
  return members;
}

export function readHashField(value: unknown, field: string, index: number): string | null {
  let fieldValue: unknown;
  if (Array.isArray(value)) {
    fieldValue = value[index];
  } else if (value && typeof value === "object") {
    fieldValue = (value as Record<string, unknown>)[field];
  }

  return typeof fieldValue === "string" || typeof fieldValue === "number"
    ? String(fieldValue)
    : null;
}

export function normalizeStoredPlayerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.split("|", 1)[0].trim();
  return name || null;
}