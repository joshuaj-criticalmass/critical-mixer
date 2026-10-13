export const QR_WINDOW_MS = 30_000;
export const QR_WINDOW_TOLERANCE = 1;
export const QR_SIGNATURE_LENGTH = 12;
export const QR_CODE_DARK = "#000000";
export const QR_CODE_LIGHT = "#FFFFFF";

const encoder = new TextEncoder();
const playerIdPattern = /^[A-Za-z0-9]{10}$/;
const signaturePattern = /^[A-Za-z0-9_-]{12}$/;

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  const buffer = new ArrayBuffer(binary.length);
  new Uint8Array(buffer).set(binary);
  return buffer;
}

function encodeBase64Url(value: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signWindow(playerKey: string, playerId: string, windowNumber: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64Url(playerKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${playerId}.${windowNumber}`)
  );
  return encodeBase64Url(signature).slice(0, QR_SIGNATURE_LENGTH);
}

export async function createPlayerQrToken(
  playerId: string,
  playerKey: string,
  timestamp = Date.now()
): Promise<string> {
  const windowNumber = Math.floor(timestamp / QR_WINDOW_MS);
  const signature = await signWindow(playerKey, playerId, windowNumber);
  return `${playerId}.${windowNumber}.${signature}`;
}

export async function verifyPlayerQrToken(
  token: string,
  expectedPlayerId: string,
  playerKey: string,
  timestamp = Date.now()
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [playerId, windowValue, signature] = parts;
  if (
    !playerIdPattern.test(playerId) ||
    !signaturePattern.test(signature) ||
    playerId !== expectedPlayerId
  ) {
    return false;
  }

  const windowNumber = Number(windowValue);
  if (!Number.isSafeInteger(windowNumber)) return false;

  const currentWindow = Math.floor(timestamp / QR_WINDOW_MS);
  if (Math.abs(currentWindow - windowNumber) > QR_WINDOW_TOLERANCE) return false;

  const expectedSignature = await signWindow(playerKey, playerId, windowNumber);
  let mismatch = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    mismatch |= expectedSignature.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}