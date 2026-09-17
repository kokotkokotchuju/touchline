import "server-only";
import { connectRedis } from "@/server/infrastructure/redis";
import { getServerEnv } from "@/server/env";

type Bucket = { count: number; resetAt: number };
const fallback = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_FALLBACK_KEYS = 10_000;

export async function checkRateLimit(
  key: string,
  limit = 60,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS;
  try {
    const redis = await connectRedis(getServerEnv());
    if (redis) {
      const redisKey = `ratelimit:v1:${key}:${Math.floor(now / WINDOW_MS)}`;
      try {
        const current = await redis.increment(redisKey, 60);
        return {
          allowed: current <= limit,
          remaining: Math.max(0, limit - current),
          resetAt,
        };
      } finally {
        await redis.close();
      }
    }
  } catch {
    // Fall through to bounded local protection when Redis is unavailable.
  }
  const bucket = fallback.get(key);
  const active =
    bucket && bucket.resetAt > now ? bucket : { count: 0, resetAt };
  active.count += 1;
  if (fallback.size > MAX_FALLBACK_KEYS)
    fallback.delete(fallback.keys().next().value ?? key);
  fallback.set(key, active);
  return {
    allowed: active.count <= limit,
    remaining: Math.max(0, limit - active.count),
    resetAt: active.resetAt,
  };
}

export function requestAddress(request: Request) {
  let address = "unknown";
  try {
    if (getServerEnv().TRUST_PROXY) {
      address =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        address;
    }
  } catch {
    // Configuration validation is handled by the caller; do not trust spoofable headers.
  }
  return address;
}
