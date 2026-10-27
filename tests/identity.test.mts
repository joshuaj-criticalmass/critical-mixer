import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPlayerId,
  createRecoveryCode,
  formatPlayerName,
  normalizeNameForMatch,
  normalizeNameParts,
  normalizePlayerName,
  normalizeRecoveryCode,
} from "../src/lib/identity.ts";
import { recoveryWords } from "../src/lib/recovery-words.ts";

test("recovery vocabulary has 200 unique words", () => {
  assert.equal(recoveryWords.length, 200);
  assert.equal(new Set(recoveryWords).size, 200);
});

test("recovery codes use two words and a two-digit suffix", () => {
  const values = [0, 1, 9];
  const code = createRecoveryCode(() => values.shift() ?? 0);

  assert.equal(code, "ACORN-ALPINE-09");
  assert.equal(normalizeRecoveryCode(code.toLowerCase()), code);
});

test("player names are trimmed and limited to forty characters", () => {
  assert.equal(normalizePlayerName("  Jordan Lee  "), "Jordan Lee");
  assert.equal(normalizePlayerName("   "), null);
  assert.equal(normalizePlayerName("x".repeat(41)), null);
});

test("recovery name comparison ignores case and extra whitespace", () => {
  assert.equal(normalizeNameForMatch("  Sam   Lee "), "sam lee");
});

test("name parts require first and last names and allow an optional middle", () => {
  assert.deepEqual(
    normalizeNameParts({ firstName: " Mike ", middleName: "", lastName: "  Van  Dyke " }),
    { firstName: "Mike", middleName: "", lastName: "Van Dyke" }
  );
  assert.equal(normalizeNameParts({ firstName: "Mike", lastName: "  " }), null);
  assert.equal(normalizeNameParts({ firstName: "", lastName: "Lee" }), null);
  assert.equal(normalizeNameParts({ firstName: "x".repeat(31), lastName: "Lee" }), null);
  assert.equal(normalizeNameParts({ firstName: "Mi|ke", lastName: "Lee" })?.firstName, "Mike");
});

test("full names skip an empty middle name", () => {
  assert.equal(formatPlayerName({ firstName: "Mike", middleName: "", lastName: "Lee" }), "Mike Lee");
  assert.equal(
    formatPlayerName({ firstName: "Mike", middleName: "J", lastName: "Lee" }),
    "Mike J Lee"
  );
});

test("player IDs are ten base62 characters", () => {
  assert.match(createPlayerId(), /^[A-Za-z0-9]{10}$/);
});