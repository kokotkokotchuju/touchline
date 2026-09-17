import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = redis.get;
    set = redis.set;
  },
}));
import { withRedisCache } from "@/server/cache";
import { getServerEnv } from "@/server/env";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("REDIS_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function configureRedis() {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.invalid");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
}
describe("Private infrastructure", () => {
  it("does not require infrastructure credentials for preview development", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const load = vi.fn().mockResolvedValue({ value: 1 });
    expect(await withRedisCache("test", 30, load)).toEqual({ value: 1 });
    expect(load).toHaveBeenCalledOnce();
  });
  it("returns cache hits without a source read", async () => {
    configureRedis();
    redis.get.mockResolvedValue({ value: 2 });
    const load = vi.fn();
    expect(await withRedisCache("test", 30, load)).toEqual({ value: 2 });
    expect(load).not.toHaveBeenCalled();
  });
  it("serves source data when Redis read and write fail", async () => {
    configureRedis();
    redis.get.mockRejectedValue(new Error("secret detail"));
    redis.set.mockRejectedValue(new Error("secret detail"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      await withRedisCache("test", 30, async () => ({ value: 3 })),
    ).toEqual({ value: 3 });
    expect(JSON.stringify(warning.mock.calls)).not.toContain("secret detail");
  });
  it("does not cache a failed source load", async () => {
    configureRedis();
    redis.get.mockResolvedValue(null);
    redis.set.mockClear();
    await expect(
      withRedisCache("test", 30, async () => {
        throw new Error("upstream unavailable");
      }),
    ).rejects.toThrow("upstream unavailable");
    expect(redis.set).not.toHaveBeenCalled();
  });
  it("rejects partial Redis configuration without printing credentials", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "private-token");
    expect(() => getServerEnv()).toThrow("UPSTASH_REDIS_REST_URL");
    try {
      getServerEnv();
    } catch (error) {
      expect(String(error)).not.toContain("private-token");
    }
  });
  it("rejects competing Redis transports and invalid database protocols", () => {
    configureRedis();
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    expect(() => getServerEnv()).toThrow("REDIS_URL");
    vi.stubEnv("DATABASE_URL", "https://private.invalid");
    expect(() => getServerEnv()).toThrow("DATABASE_URL");
  });
});
