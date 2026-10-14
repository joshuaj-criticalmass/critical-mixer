import type { ScoredMember } from "./redis-shapes.ts";

export type NamedPlayer = { id: string; name: string };
export type LeaderboardTier = {
  points: number;
  count: number;
  players: NamedPlayer[];
};
export type Winner = { name: string; points: number };

export function buildRevealedLeaderboard(
  scores: ScoredMember[],
  names: Record<string, string>
): { top3: LeaderboardTier[]; winners: Winner[] } {
  const tiers: LeaderboardTier[] = [];
  const sorted = [...scores].sort((left, right) => right.score - left.score);

  for (const score of sorted) {
    let tier = tiers.find((item) => item.points === score.score);
    if (!tier) {
      if (tiers.length === 3) continue;
      tier = { points: score.score, count: 0, players: [] };
      tiers.push(tier);
    }
    tier.count += 1;
    const name = names[score.member]?.split("|", 1)[0].trim();
    if (name) tier.players.push({ id: score.member, name });
  }

  const winners = tiers[0]?.players.map(({ name }) => ({
    name,
    points: tiers[0].points,
  })) ?? [];
  return { top3: tiers, winners };
}