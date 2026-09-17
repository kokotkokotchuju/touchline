import { createClient } from "redis";
import { Redis } from "@upstash/redis";
import type { InfrastructureConfig } from "./config";

export interface RedisConnection {
  increment(key: string, ttlSeconds: number): Promise<number>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

const incrementWithExpiry =
  "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";

export async function connectRedis(
  config: InfrastructureConfig,
): Promise<RedisConnection | null> {
  if (config.REDIS_URL) {
    const client = createClient({
      url: config.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 3000, reconnectStrategy: false },
    });
    // Commands reject to their callers; never log a connection URL or password.
    client.on("error", () => {});
    try {
      await client.connect();
    } catch (error) {
      if (client.isOpen) client.destroy();
      throw error;
    }
    const command = () =>
      client.withCommandOptions({ abortSignal: AbortSignal.timeout(2000) });
    return {
      async increment(key, ttlSeconds) {
        return Number(
          await command().eval(incrementWithExpiry, {
            keys: [key],
            arguments: [String(ttlSeconds)],
          }),
        );
      },
      async get<T>(key: string) {
        const value = await command().get(key);
        return value === null ? null : (JSON.parse(value) as T);
      },
      async set<T>(key: string, value: T, ttlSeconds: number) {
        await command().set(key, JSON.stringify(value), { EX: ttlSeconds });
      },
      async del(key: string) {
        await command().del(key);
      },
      async ping() {
        return (await command().ping()) === "PONG";
      },
      async close() {
        if (client.isOpen) client.destroy();
      },
    };
  }
  if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
    const client = new Redis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN,
      retry: { retries: 0 },
      signal: () => AbortSignal.timeout(2000),
    });
    return {
      increment: async (key, ttlSeconds) =>
        Number(await client.eval(incrementWithExpiry, [key], [ttlSeconds])),
      get: <T>(key: string) => client.get<T>(key),
      async set<T>(key: string, value: T, ttlSeconds: number) {
        await client.set(key, value, { ex: ttlSeconds });
      },
      async del(key: string) {
        await client.del(key);
      },
      async ping() {
        return (await client.ping()) === "PONG";
      },
      async close() {},
    };
  }
  return null;
}
