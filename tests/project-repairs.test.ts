import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  createSession: vi.fn(),
  clearSession: vi.fn(),
  passwordHash: vi.fn(),
  verifyPassword: vi.fn(),
  rateLimit: vi.fn(),
  live: vi.fn(),
  db: {
    competition: { findMany: vi.fn() },
    team: { findMany: vi.fn() },
    player: { findMany: vi.fn() },
    userFavorite: { deleteMany: vi.fn(), createMany: vi.fn() },
    userNotificationPreference: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/server/auth", () => ({
  getCurrentUser: mocks.currentUser,
  createSession: mocks.createSession,
  clearSession: mocks.clearSession,
  passwordHash: mocks.passwordHash,
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/server/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: mocks.rateLimit,
  requestAddress: () => "test",
}));
vi.mock("@/server/football/live-read-service", () => ({
  getStoredLiveMatches: mocks.live,
}));
import { requireSameOrigin } from "@/server/production";
import { PUT } from "@/app/api/account/route";
import { POST, DELETE } from "@/app/api/auth/route";
import { GET as live } from "@/app/api/v1/live/route";
import { searchQuery } from "@/server/football/search-service";

const origin = "https://football.test";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("NODE_ENV", "test");
  mocks.rateLimit.mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetAt: Date.now() + 60000,
  });
});
afterEach(() => vi.unstubAllEnvs());
function request(
  method: string,
  body?: unknown,
  originHeader: string | null = origin,
) {
  return new Request(`${origin}/api/account`, {
    method,
    headers: {
      ...(originHeader ? { origin: originHeader } : {}),
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("Account mutation protection", () => {
  it.each([null, "https://attacker.test", "null"])(
    "rejects missing/untrusted origin %s before authentication or database writes",
    async (value) => {
      expect(requireSameOrigin(request("POST", {}, value))).toBe(false);
      expect((await POST(request("POST", {}, value))).status).toBe(403);
      expect((await DELETE(request("DELETE", undefined, value))).status).toBe(
        403,
      );
      expect((await PUT(request("PUT", {}, value))).status).toBe(403);
      expect(mocks.currentUser).not.toHaveBeenCalled();
      expect(mocks.clearSession).not.toHaveBeenCalled();
    },
  );
  it("allows a configured same-origin mutation and denies cross-site fetch metadata", () => {
    expect(requireSameOrigin(request("POST", {}))).toBe(true);
    expect(
      requireSameOrigin(
        new Request(`${origin}/api/account`, {
          headers: { origin, "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toBe(false);
  });
  it("rejects malformed favorite IDs as 400 and deduplicates valid favorites", async () => {
    mocks.currentUser.mockResolvedValue({ id: "test-user" });
    const preferences = {
      matchStarting: true,
      goal: true,
      halftime: false,
      fullTime: true,
      lineups: true,
    };
    expect(
      (
        await PUT(
          request("PUT", {
            favorites: { competitions: ["bad"], teams: [], players: [] },
            preferences,
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.db.competition.findMany).not.toHaveBeenCalled();
    const id = "e0015bbc-a1d6-4836-8175-45ad7112491f";
    mocks.db.competition.findMany.mockResolvedValue([{ id }]);
    mocks.db.team.findMany.mockResolvedValue([]);
    mocks.db.player.findMany.mockResolvedValue([]);
    mocks.db.$transaction.mockImplementation(async (run) => run(mocks.db));
    expect(
      (
        await PUT(
          request("PUT", {
            favorites: { competitions: [id, id], teams: [], players: [] },
            preferences,
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.db.userFavorite.createMany).toHaveBeenCalledWith({
      data: [{ userId: "test-user", competitionId: id }],
    });
  });
});
describe("Stored live reads and search bounds", () => {
  it("returns normalized stored live data and sanitized failures", async () => {
    mocks.currentUser.mockResolvedValue({ id: "member" });
    mocks.live.mockResolvedValue({
      data: [],
      source: "synchronized",
      truncated: false,
    });
    expect(
      await (await live(new Request(`${origin}/api/v1/live`))).json(),
    ).toEqual({ data: [], source: "synchronized", truncated: false });
    mocks.live.mockRejectedValue(new Error("private connection information"));
    const response = await live(new Request(`${origin}/api/v1/live`));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
  it("rejects repeated and oversized page queries before string operations", () => {
    expect(searchQuery.safeParse(["a", "b"]).success).toBe(false);
    expect(searchQuery.safeParse("a".repeat(101)).success).toBe(false);
    expect(searchQuery.parse("  Harbour  ")).toBe("Harbour");
  });
});
