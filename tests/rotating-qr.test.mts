import assert from "node:assert/strict";
import { test } from "node:test";
import { hmacBase64Url } from "../src/lib/identity.ts";
import {
  createPlayerQrToken,
  QR_WINDOW_MS,
  verifyPlayerQrToken,
} from "../src/lib/rotating-qr.ts";

const playerId = "aBc123XyZ9";
const timestamp = Math.floor(1_760_000_000_000 / QR_WINDOW_MS) * QR_WINDOW_MS;

test("QR token remains stable within a 30-second window and rotates at the boundary", async () => {
  const playerKey = await hmacBase64Url("test-secret", playerId);
  const first = await createPlayerQrToken(playerId, playerKey, timestamp);
  const sameWindow = await createPlayerQrToken(playerId, playerKey, timestamp + 29_999);
  const nextWindow = await createPlayerQrToken(playerId, playerKey, timestamp + QR_WINDOW_MS);

  assert.equal(first, sameWindow);
  assert.notEqual(first, nextWindow);
});

test("QR verification accepts the current and adjacent windows only", async () => {
  const playerKey = await hmacBase64Url("test-secret", playerId);
  const currentWindow = Math.floor(timestamp / QR_WINDOW_MS);

  for (const offset of [-1, 0, 1]) {
    const token = await createPlayerQrToken(
      playerId,
      playerKey,
      (currentWindow + offset) * QR_WINDOW_MS
    );
    assert.equal(await verifyPlayerQrToken(token, playerId, playerKey, timestamp), true);
  }

  const expiredToken = await createPlayerQrToken(
    playerId,
    playerKey,
    (currentWindow + 2) * QR_WINDOW_MS
  );
  assert.equal(await verifyPlayerQrToken(expiredToken, playerId, playerKey, timestamp), false);
});

test("QR signatures are bound to the player key and ID", async () => {
  const playerKey = await hmacBase64Url("test-secret", playerId);
  const otherPlayerKey = await hmacBase64Url("different-secret", playerId);
  const token = await createPlayerQrToken(playerId, playerKey, timestamp);

  assert.equal(await verifyPlayerQrToken(token, playerId, otherPlayerKey, timestamp), false);
  assert.equal(await verifyPlayerQrToken(token, "otherId123", playerKey, timestamp), false);
  assert.equal(await verifyPlayerQrToken("malformed", playerId, playerKey, timestamp), false);
});