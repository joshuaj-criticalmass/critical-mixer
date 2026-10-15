import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWrappedData } from "../src/lib/wrapped.ts";

test("wrapped stats build London hourly bins and select the busiest hour", () => {
  const start = Date.parse("2026-11-04T12:00:00Z");
  const end = Date.parse("2026-11-04T14:00:00Z");
  const wrapped = buildWrappedData(
    {
      players: "487",
      meets: "12",
      "hour:2026-11-04T12": "3",
      "hour:2026-11-04T13": "7",
    },
    [],
    {},
    start,
    end
  );

  assert.equal(wrapped.players, 487);
  assert.equal(wrapped.meets, 12);
  assert.equal(wrapped.hourly.length, 3);
  assert.equal(wrapped.peakHour?.bucket, "2026-11-04T13");
  assert.equal(wrapped.peakHour?.label, "Wednesday, 1pm–2pm");
  assert.equal(wrapped.hourly[2].meets, 0);
});

test("wrapped stats preserve all tied winners and company-free tiers", () => {
  const wrapped = buildWrappedData(
    { players: 3, meets: 9 },
    [
      { member: "player-a", score: 8 },
      { member: "player-b", score: 8 },
      { member: "player-c", score: 4 },
    ],
    { "player-a": "Alex", "player-b": "Sam|Tribal", "player-c": "Jamie" }
  );

  assert.deepEqual(wrapped.winners, [
    { name: "Alex", points: 8 },
    { name: "Sam", points: 8 },
  ]);
  assert.deepEqual(wrapped.top3.map(({ points, count }) => ({ points, count })), [
    { points: 8, count: 2 },
    { points: 4, count: 1 },
  ]);
  assert.equal(wrapped.peakHour, null);
});