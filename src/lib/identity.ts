import { randomInt } from "node:crypto";
import { customAlphabet } from "nanoid";
import { recoveryWords } from "./recovery-words.ts";

const playerId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);
const recoveryCodePattern = /^[A-Z]+-[A-Z]+-\d{2}$/;
const encoder = new TextEncoder();

export type PlayerSession = {
  playerId: string;
  playerKey: string;
  sessionSig: string;
  name: string;
  recoveryCode: string;
};

export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

export function normalizeNameForMatch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

export function normalizeRecoveryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return recoveryCodePattern.test(code) ? code : null;
}

export function createRecoveryCode(randomIndex: (max: number) => number = randomInt): string {
  const first = recoveryWords[randomIndex(recoveryWords.length)];
  const second = recoveryWords[randomIndex(recoveryWords.length)];
  const number = String(randomIndex(100)).padStart(2, "0");
  return `${first}-${second}-${number}`.toUpperCase();
}

export function createPlayerId(): string {
  return playerId();
}

export async function hmacBase64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(signature).toString("base64url");
}

export async function verifySessionSignature(
  playerId: string,
  suppliedSignature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await hmacBase64Url(secret, `${playerId}:session`);
  if (expectedSignature.length !== suppliedSignature.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    mismatch |= expectedSignature.charCodeAt(index) ^ suppliedSignature.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createPlayerSession(
  playerId: string,
  name: string,
  recoveryCode: string,
  secret: string
): Promise<PlayerSession> {
  const [playerKey, sessionSig] = await Promise.all([
    hmacBase64Url(secret, playerId),
    hmacBase64Url(secret, `${playerId}:session`),
  ]);

  return { playerId, playerKey, sessionSig, name, recoveryCode };
}