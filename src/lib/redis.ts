import { Redis } from "@upstash/redis";

const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

export const redisConfigured = Boolean(url && token);
let client: Redis | undefined;

export function getRedis(): Redis {
  if (!redisConfigured) {
    throw new Error("Missing Upstash Redis REST credentials.");
  }

  client ??= new Redis({ url, token });
  return client;
}