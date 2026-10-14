import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRevealedLeaderboard } from "../src/lib/leaderboard.ts";

test("revealed leaderboard uses distinct score tiers and counts ties", () => {
  const result = buildRevealedLeaderboard(
    [
      { member: "player-a", score: 12 },
      { member: "player-b", score: 12 },
      { member: "player-c", score: 9 },
      { member: "player-d", score: 7 },
      { member: "player-e", score: 7 },
      { member: "player-f", score: 6 },
    ],
    {
      "player-a": "Alex",
      "player-b": "Sam",
      "player-c": "Jamie",
      "player-d": "Riley",
      "player-e": "Taylor",
      "player-f": "Casey",
    }
  );

  assert.deepEqual(result.top3.map(({ points, count }) => ({ points, count })), [
    { points: 12, count: 2 },
    { points: 9, count: 1 },
    { points: 7, count: 2 },
  ]);
});

test("every player tied at the highest score is a winner", () => {
  const result = buildRevealedLeaderboard(
    [
      { member: "player-a", score: 12 },
      { member: "player-b", score: 12 },
      { member: "player-c", score: 9 },
    ],
    { "player-a": "Alex", "player-b": "Sam", "player-c": "Jamie" }
  );

  assert.deepEqual(result.winners, [
    { name: "Alex", points: 12 },
    { name: "Sam", points: 12 },
  ]);
});

test("legacy company suffixes are not revealed as player identity", () => {
  const result = buildRevealedLeaderboard(
    [{ member: "player-a", score: 1 }],
    { "player-a": "Alex|Tribal" }
  );

  assert.deepEqual(result.winners, [{ name: "Alex", points: 1 }]);
});