import assert from "node:assert/strict";
import { test } from "node:test";
import { icebreakers } from "../src/lib/icebreakers.ts";
import { getIcebreakerQuestion, getPairKey, extractPlayerQrToken } from "../src/lib/scan-utils.ts";

const firstPlayerId = "aBc123XyZ9";
const secondPlayerId = "QwE987rTy6";
const token = `${secondPlayerId}.58666666.AbCdEfGhIjKl`;

test("scanner accepts signed token text and QR links, but rejects other URLs", () => {
  assert.equal(extractPlayerQrToken(token), token);
  assert.equal(
    extractPlayerQrToken(`https://critical-mixer.vercel.app/m/${token}`),
    token
  );
  assert.equal(extractPlayerQrToken("https://example.com/hello"), null);
  assert.equal(extractPlayerQrToken("not a QR token"), null);
});

test("pair keys and icebreakers are deterministic regardless of scan direction", () => {
  assert.equal(
    getPairKey(firstPlayerId, secondPlayerId),
    getPairKey(secondPlayerId, firstPlayerId)
  );
  assert.equal(
    getIcebreakerQuestion(firstPlayerId, secondPlayerId),
    getIcebreakerQuestion(secondPlayerId, firstPlayerId)
  );
  assert.ok(icebreakers.includes(getIcebreakerQuestion(firstPlayerId, secondPlayerId)));
  assert.equal(icebreakers.length, 50);
});