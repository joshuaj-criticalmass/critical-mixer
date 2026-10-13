import { Redis } from "@upstash/redis";

const url =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

if (!url || !token) {
  console.warn(
    "[redis] Missing Redis REST credentials. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  );
}

export const redis = new Redis({ url, token });