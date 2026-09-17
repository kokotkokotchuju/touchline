import "server-only";
import { connectRedis, type RedisConnection } from "./infrastructure/redis";
import { getServerEnv } from "./env";

let pendingConnection: Promise<RedisConnection | null> | undefined;
const cacheMetrics = { hits: 0, misses: 0, writes: 0, redisUnavailable: 0 };

export function getCacheMetrics() {
  return { ...cacheMetrics };
}

async function discardConnection(connection: RedisConnection | null) {
  pendingConnection = undefined;
  await connection?.close().catch(() => {});
}

/** Optional until provider integration. Never caches an upstream failure. */
export async function withRedisCache<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1)
    throw new Error("Cache TTL must be a positive integer.");
  const env = getServerEnv();
  if (!env.REDIS_URL && !env.UPSTASH_REDIS_REST_URL) return load();
  let redis: RedisConnection | null = null;
  try {
    // Share connection establishment across concurrent requests.
    pendingConnection ??= connectRedis(env);
    redis = await pendingConnection;
    if (!redis) {
      cacheMetrics.misses++;
      return load();
    }
    const cached = await redis.get<T>(`touchline:v1:${key}`);
    if (cached !== null) {
      cacheMetrics.hits++;
      return cached;
    }
    cacheMetrics.misses++;
  } catch {
    await discardConnection(redis);
    redis = null;
    cacheMetrics.redisUnavailable++;
    cacheMetrics.misses++;
    console.warn("Redis read unavailable; loading from source.");
  }
  const value = await load();
  try {
    await redis?.set(`touchline:v1:${key}`, value, ttlSeconds);
    if (redis) cacheMetrics.writes++;
  } catch {
    await discardConnection(redis);
    console.warn("Redis write unavailable.");
  }
  return value;
}
