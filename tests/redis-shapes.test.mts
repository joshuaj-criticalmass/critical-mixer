import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeStoredPlayerName,
  parseScoredMembers,
  readHashField,
} from "../src/lib/redis-shapes.ts";

test("scored members parse both object and alternating Redis response shapes", () => {
  assert.deepEqual(
    parseScoredMembers([{ member: "player-a", score: 123 }, { member: "player-b", score: "456" }]),
    [{ member: "player-a", score: 123 }, { member: "player-b", score: 456 }]
  );
  assert.deepEqual(
    parseScoredMembers(["player-a", "123", "player-b", 456]),
    [{ member: "player-a", score: 123 }, { member: "player-b", score: 456 }]
  );
  assert.deepEqual(parseScoredMembers(["player-a", "not-a-score"]), []);
});

test("hash field reader handles array and object forms", () => {
  assert.equal(readHashField(["18", "11"], "points", 0), "18");
  assert.equal(readHashField({ points: 18 }, "points", 0), "18");
});

test("stored names do not surface legacy company suffixes", () => {
  assert.equal(normalizeStoredPlayerName("Jordan Lee|Tribal"), "Jordan Lee");
  assert.equal(normalizeStoredPlayerName("Jordan Lee"), "Jordan Lee");
  assert.equal(normalizeStoredPlayerName(" |Tribal"), null);
});