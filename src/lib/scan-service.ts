import { getRedis } from "./redis";
import { getPairKey } from "./scan-utils";

export const PENDING_SCAN_MS = 10 * 60 * 1000;

const applyScanScript = `
local pairKey = KEYS[1]
local scannerId = ARGV[2]
local targetId = ARGV[3]
local now = tonumber(ARGV[1])
local pendingWindow = tonumber(ARGV[4])

if redis.call("HGET", pairKey, "confirmedAt") then
  return {"already_met"}
end

local targetScan = tonumber(redis.call("HGET", pairKey, targetId) or "")
if targetScan and now >= targetScan and now - targetScan <= pendingWindow then
  if redis.call("HSETNX", pairKey, "confirmedAt", tostring(now)) == 0 then
    return {"already_met"}
  end

  redis.call("HINCRBY", KEYS[2], "points", 1)
  redis.call("HINCRBY", KEYS[2], "meetCount", 1)
  redis.call("HINCRBY", KEYS[3], "points", 1)
  redis.call("HINCRBY", KEYS[3], "meetCount", 1)
  redis.call("ZINCRBY", KEYS[4], 1, scannerId)
  redis.call("ZINCRBY", KEYS[4], 1, targetId)
  redis.call("ZADD", KEYS[5], now, targetId)
  redis.call("ZADD", KEYS[6], now, scannerId)
  redis.call("ZREM", KEYS[7], targetId)
  redis.call("ZREM", KEYS[8], scannerId)
  redis.call("HINCRBY", KEYS[9], "meets", 1)
  redis.call("HINCRBY", KEYS[9], ARGV[5], 1)

  local publicRaw = redis.call("GET", KEYS[10])
  local publicState = {}
  if publicRaw then
    local ok, decoded = pcall(cjson.decode, publicRaw)
    if ok and type(decoded) == "table" then
      publicState = decoded
    end
  end

  local rows = redis.call("ZREVRANGE", KEYS[4], 0, 99, "WITHSCORES")
  local top3 = {}
  local seen = {}
  for index = 1, #rows, 2 do
    local points = tonumber(rows[index + 1])
    if not seen[points] then
      seen[points] = true
      table.insert(top3, {
        points = points,
        count = redis.call("ZCOUNT", KEYS[4], points, points)
      })
      if #top3 == 3 then break end
    end
  end
  publicState.top3 = top3
  publicState.updatedAt = now
  redis.call("SET", KEYS[10], cjson.encode(publicState))

  return {"confirmed", tostring(now)}
end

local scannerScan = tonumber(redis.call("HGET", pairKey, scannerId) or "")
if scannerScan and now >= scannerScan and now - scannerScan <= pendingWindow then
  return {"pending", tostring(scannerScan)}
end

redis.call("HSET", pairKey, scannerId, tostring(now))
redis.call("ZADD", KEYS[8], now, scannerId)
redis.call("ZREM", KEYS[7], targetId)
return {"pending", tostring(now)}
`;

export type ScanTransition =
  | { result: "pending"; scannedAt: number }
  | { result: "confirmed"; confirmedAt: number }
  | { result: "already_met" };

export async function applyPlayerScan(
  scannerId: string,
  targetId: string,
  now = Date.now()
): Promise<ScanTransition> {
  const redis = getRedis();
  const hourBucket = `hour:${new Date(now).toISOString().slice(0, 13)}`;
  const result = await redis.eval(
    applyScanScript,
    [
      getPairKey(scannerId, targetId),
      `cmx:player:${scannerId}`,
      `cmx:player:${targetId}`,
      "cmx:scores",
      `cmx:met:${scannerId}`,
      `cmx:met:${targetId}`,
      `cmx:pending:${scannerId}`,
      `cmx:pending:${targetId}`,
      "cmx:stats",
      "cmx:public",
    ],
    [String(now), scannerId, targetId, String(PENDING_SCAN_MS), hourBucket]
  );

  if (!Array.isArray(result) || typeof result[0] !== "string") {
    throw new Error("Invalid scan transaction response.");
  }

  if (result[0] === "already_met") return { result: "already_met" };
  if (result[0] === "pending") {
    return { result: "pending", scannedAt: Number(result[1]) };
  }
  if (result[0] === "confirmed") {
    return { result: "confirmed", confirmedAt: Number(result[1]) };
  }

  throw new Error("Unknown scan transaction result.");
}