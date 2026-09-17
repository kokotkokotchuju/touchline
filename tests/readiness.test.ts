import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@/server/infrastructure/postgres", () => ({
  createDatabaseClient: () => ({
    $queryRaw: mocks.query,
    $disconnect: mocks.disconnect,
  }),
}));
vi.mock("@/server/infrastructure/redis", () => ({
  connectRedis: mocks.connect,
}));
import { checkInfrastructure } from "@/server/infrastructure/check";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockResolvedValue([{ value: 1 }]);
  mocks.disconnect.mockResolvedValue(undefined);
  mocks.close.mockResolvedValue(undefined);
  mocks.del.mockResolvedValue(undefined);
  mocks.set.mockResolvedValue(undefined);
  mocks.ping.mockResolvedValue(true);
  mocks.connect.mockResolvedValue({
    ping: mocks.ping,
    get: mocks.get,
    set: mocks.set,
    del: mocks.del,
    close: mocks.close,
  });
});

describe("Infrastructure readiness semantics", () => {
  it("reports missing configuration as unavailable", async () => {
    mocks.connect.mockResolvedValue(null);
    expect(await checkInfrastructure({})).toEqual({
      status: "unavailable",
      database: "not_configured",
      redis: "not_configured",
    });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("requires both services and keeps the HTTP probe read-only", async () => {
    expect(
      await checkInfrastructure({ DATABASE_URL: "postgres://localhost/test" }),
    ).toEqual({ status: "ok", database: "up", redis: "up" });
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("sanitizes connection failures and releases resources", async () => {
    mocks.query.mockRejectedValue(new Error("private database detail"));
    mocks.ping.mockRejectedValue(new Error("private Redis detail"));
    expect(
      await checkInfrastructure({ DATABASE_URL: "postgres://localhost/test" }),
    ).toEqual({ status: "unavailable", database: "down", redis: "down" });
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it("verifies write/read/delete using a unique expiring CLI probe key", async () => {
    mocks.get.mockImplementation(async (key: string) => ({ probe: key }));
    const result = await checkInfrastructure(
      { DATABASE_URL: "postgres://localhost/test" },
      true,
    );
    expect(result.status).toBe("ok");
    const key = mocks.set.mock.calls[0][0];
    expect(key).toMatch(/^touchline:health:[\da-f-]{36}$/);
    expect(mocks.set).toHaveBeenCalledWith(key, { probe: key }, 15);
    expect(mocks.del).toHaveBeenCalledWith(key);
  });
  it("does not accept a failed round trip even when ping succeeds", async () => {
    mocks.get.mockResolvedValue(null);
    expect(
      (
        await checkInfrastructure(
          { DATABASE_URL: "postgres://localhost/test" },
          true,
        )
      ).redis,
    ).toBe("down");
    expect(mocks.del).toHaveBeenCalledOnce();
  });
});
