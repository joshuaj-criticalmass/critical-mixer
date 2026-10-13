import assert from "node:assert/strict";
import { test } from "node:test";
import {
  companies,
  createPlayerId,
  createRecoveryCode,
  isCompany,
  normalizeNameForMatch,
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

test("company validation accepts only the four game companies", () => {
  assert.deepEqual(companies, ["Critical Mass", "artbot.", "Tribal", "RAPP"]);
  assert.equal(isCompany("Tribal"), true);
  assert.equal(isCompany("Other"), false);
});

test("player IDs are ten base62 characters", () => {
  assert.match(createPlayerId(), /^[A-Za-z0-9]{10}$/);
});