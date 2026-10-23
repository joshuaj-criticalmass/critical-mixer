import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLiveSnapshot } from "../src/lib/live.ts";

const now = Date.UTC(2026, 10, 4, 14, 25);

test("live snapshot strips names and keeps only three tiers", () => {
  const snapshot = buildLiveSnapshot(
    JSON.stringify({
      status: "active",
      top3: [
        { points: 9, count: 2, players: [{ id: "a", name: "Alex" }] },
        { points: 7, count: 1 },
        { points: 5, count: 4 },
        { points: 4, count: 1 },
      ],
    }),
    { players: "40", meets: 61 },
    now
  );

  assert.equal(snapshot.status, "active");
  assert.equal(snapshot.players, 40);
  assert.equal(snapshot.meets, 61);
  assert.deepEqual(snapshot.top3, [
    { points: 9, count: 2 },
    { points: 7, count: 1 },
    { points: 5, count: 4 },
  ]);
  assert.ok(!JSON.stringify(snapshot).includes("Alex"));
});

test("live snapshot reads hourly buckets ending at the current hour", () => {
  const snapshot = buildLiveSnapshot(
    { status: "active", top3: [] },
    { "hour:2026-11-04T14": 6, "hour:2026-11-04T12": "3" },
    now,
    3
  );

  assert.deepEqual(snapshot.recentHours, [
    { start: Date.UTC(2026, 10, 4, 12), meets: 3 },
    { start: Date.UTC(2026, 10, 4, 13), meets: 0 },
    { start: Date.UTC(2026, 10, 4, 14), meets: 6 },
  ]);
});

test("live snapshot falls back to lobby for missing or invalid state", () => {
  const snapshot = buildLiveSnapshot("not json", null, now, 1);
  assert.equal(snapshot.status, "lobby");
  assert.equal(snapshot.players, 0);
  assert.equal(snapshot.meets, 0);
  assert.deepEqual(snapshot.top3, []);
});
