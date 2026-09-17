vi.mock("@/server/auth", () => ({
  getCurrentUser: async () => ({ id: "member" }),
}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dateBounds,
  centerKickoff,
  eventMinute,
  groupMatches,
  matchPublicId,
  matchQuerySchema,
  matchesHref,
  statusLabel,
  type CenterMatch,
} from "@/lib/football/match-center";
const service = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn() }));
vi.mock("@/server/football/match-center-service", () => ({
  getMatchCenterList: service.list,
  getMatchCenterDetail: service.detail,
}));
import { GET } from "@/app/api/v1/matches/route";
import { matchDetailResponse } from "@/server/football/match-center-api";
beforeEach(() => vi.resetAllMocks());

describe("Match center URLs and time semantics", () => {
  it("shows the local calendar date when a kickoff crosses the UTC day", () => {
    expect(
      centerKickoff("2026-09-15T23:30:00Z", "Europe/Bratislava"),
    ).toContain("16 Sept 2026");
    expect(
      centerKickoff("2026-09-15T23:30:00Z", "Europe/Bratislava"),
    ).toContain("01:30");
    expect(centerKickoff("2026-09-15T19:00:00Z", "UTC")).toBe("19:00");
  });
  it("uses a half-open UTC day across leap years and month boundaries", () => {
    const bounds = dateBounds("2024-02-29");
    expect(bounds.start.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(dateBounds("2026-12-31").end.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
  it.each([
    "2026-02-29",
    "2026-02-30",
    "not-a-date",
    "0000-01-01",
    "2201-01-01",
  ])("rejects an invalid date %s", (date) =>
    expect(() => dateBounds(date)).toThrow(),
  );
  it("preserves shareable filters and uses date-path canonical URLs", () => {
    expect(
      matchesHref("2026-09-15", {
        status: "live",
        country: "england",
        competition: "demo-premier-league",
        timeZone: "Europe/Bratislava",
      }),
    ).toBe(
      "/matches/2026-09-15?status=live&competition=demo-premier-league&country=england&timeZone=Europe%2FBratislava",
    );
    expect(matchesHref("2026-09-15", { status: "all", timeZone: "UTC" })).toBe(
      "/matches/2026-09-15",
    );
  });
  it("resolves bigint public IDs without losing precision", () => {
    expect(matchPublicId("old-descriptive-prefix-9007199254740993")).toBe(
      "9007199254740993",
    );
    expect(matchPublicId("a-vs-b-9223372036854775808")).toBeNull();
    expect(matchPublicId("a-vs-b-0")).toBeNull();
    expect(matchPublicId("a-vs-b-01")).toBeNull();
  });
  it("keeps all match states distinct and never invents a live minute", () => {
    expect(
      statusLabel({ status: "live", minute: null, addedMinute: null }),
    ).toBe("Live");
    expect(statusLabel({ status: "live", minute: 90, addedMinute: 4 })).toBe(
      "90+4′ · Live",
    );
    expect(
      statusLabel({ status: "halftime", minute: 45, addedMinute: null }),
    ).toBe("Half-time");
    expect(
      statusLabel({ status: "abandoned", minute: 32, addedMinute: null }),
    ).toBe("Abandoned");
    expect(eventMinute(45, 2)).toBe("45+2′");
    expect(eventMinute(null, null)).toBe("Time unknown");
  });
  it("groups by competition country, with a distinct international section", () => {
    const row = (
      id: string,
      name: string,
      country: CenterMatch["competition"]["country"],
    ) =>
      ({
        id,
        competition: { id, slug: id, name, country, region: "Europe" },
      }) as CenterMatch;
    const result = groupMatches([
      row("b", "Cup", { slug: "england", name: "England", code: "GB-ENG" }),
      row("a", "League", { slug: "england", name: "England", code: "GB-ENG" }),
      row("c", "World cup", null),
    ]);
    expect(result.map((group) => group.name)).toEqual([
      "England",
      "International",
    ]);
    expect(result[0].competitions).toHaveLength(2);
  });
});

describe("SQL-backed internal match API", () => {
  it("passes validated filters to the read service and exposes source metadata", async () => {
    const payload = {
      data: [],
      undated: [],
      meta: {
        source: "development",
        date: "2026-09-15",
        dayTimeZone: "UTC",
        timeZone: "UTC",
        count: 0,
      },
    };
    service.list.mockResolvedValue(payload);
    const response = await GET(
      new Request(
        "http://localhost/api/v1/matches?date=2026-09-15&status=live&country=england",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(service.list).toHaveBeenCalledWith({
      date: "2026-09-15",
      status: "live",
      country: "england",
      timeZone: "UTC",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([
    "date=2026-02-30",
    "status=other",
    "timeZone=invalid",
    "date=2026-09-15&date=2026-09-16",
    "cursor=bad",
    "country=../../private",
    "unexpected=1",
    "q=arsenal",
  ])("rejects invalid queries %s", async (query) => {
    expect(
      (await GET(new Request(`http://localhost/api/v1/matches?${query}`)))
        .status,
    ).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });
  it("returns 503 without exposing database errors or inventing sample fallback", async () => {
    service.list.mockRejectedValue(new Error("database password=private"));
    const response = await GET(new Request("http://localhost/api/v1/matches"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
  it("returns 404 for unknown and out-of-range public IDs", async () => {
    service.detail.mockResolvedValue(null);
    expect((await matchDetailResponse("999")).status).toBe(404);
    expect((await matchDetailResponse("9223372036854775808")).status).toBe(404);
    expect((await matchDetailResponse("bad")).status).toBe(404);
    expect(service.detail).toHaveBeenCalledTimes(1);
  });
  it("serializes detail DTOs and sanitizes detail failures", async () => {
    service.detail.mockResolvedValue({
      source: "development",
      match: { publicId: "1" },
    });
    expect(await (await matchDetailResponse("1")).json()).toEqual({
      data: { source: "development", match: { publicId: "1" } },
    });
    service.detail.mockRejectedValue(new Error("private connection details"));
    const response = await matchDetailResponse("1");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
  it("accepts the required browsing filters", () => {
    for (const status of ["all", "live", "upcoming", "finished"])
      expect(matchQuerySchema.safeParse({ status }).success).toBe(true);
  });
});
