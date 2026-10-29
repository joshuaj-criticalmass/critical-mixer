import { customAlphabet } from "nanoid";

const playerId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);
const encoder = new TextEncoder();

export type PlayerSession = {
  playerId: string;
  playerKey: string;
  sessionSig: string;
  name: string;
  firstName?: string;
};

export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

export function normalizeNameForMatch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

export type PlayerNameParts = { firstName: string; middleName: string; lastName: string };

const NAME_PART_MAX = 30;

// "|" is the legacy separator in stored names, so it's never allowed in a part.
function cleanNamePart(value: unknown): string {
  return typeof value === "string" ? value.replace(/\|/g, "").trim().replace(/\s+/g, " ") : "";
}

export function normalizeNameParts(input: Record<string, unknown>): PlayerNameParts | null {
  const firstName = cleanNamePart(input.firstName);
  const middleName = cleanNamePart(input.middleName);
  const lastName = cleanNamePart(input.lastName);
  if (!firstName || !lastName) return null;
  if ([firstName, middleName, lastName].some((part) => part.length > NAME_PART_MAX)) return null;
  return { firstName, middleName, lastName };
}

export function formatPlayerName({ firstName, middleName, lastName }: PlayerNameParts): string {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
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
  secret: string,
  firstName?: string
): Promise<PlayerSession> {
  const [playerKey, sessionSig] = await Promise.all([
    hmacBase64Url(secret, playerId),
    hmacBase64Url(secret, `${playerId}:session`),
  ]);

  return { playerId, playerKey, sessionSig, name, firstName: firstName || name.split(" ")[0] };
}