vi.mock("@/server/auth", () => ({
  getCurrentUser: async () => ({ id: "member" }),
}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  competitionHref,
  competitionQuerySchema,
  defaultSeason,
  directoryQuerySchema,
  parseCompetitionPath,
} from "@/lib/football/competition-center";
const service = vi.hoisted(() => ({ page: vi.fn(), directory: vi.fn() }));
vi.mock("@/server/football/competition-service", () => ({
  getCompetitionPage: service.page,
  getCompetitionDirectory: service.directory,
}));
import {
  competitionDirectoryResponse,
  competitionPageResponse,
} from "@/server/football/competition-api";
beforeEach(() => vi.resetAllMocks());

describe("Competition navigation and scope", () => {
  it("resolves only supported current and historical sections", () => {
    expect(parseCompetitionPath()).toEqual({ section: "overview" });
    expect(parseCompetitionPath(["season", "2025-26", "standings"])).toEqual({
      season: "2025-26",
      section: "standings",
    });
    for (const path of [
      ["season"],
      ["season", "../"],
      ["squad"],
      ["stats", "extra"],
      ["season", "2025-26", "overview"],
    ])
      expect(parseCompetitionPath(path)).toBeNull();
  });
  it("retains historical stage/group identity across sections and resets match pagination elsewhere", () => {
    expect(
      competitionHref("demo-cup", "stats", "2025-26", {
        stage: "groups",
        group: "a",
        view: "results",
        page: 2,
      }),
    ).toBe("/competition/demo-cup/season/2025-26/stats?stage=groups&group=a");
    expect(
      competitionHref("demo-cup", "matches", undefined, {
        view: "results",
        page: 2,
      }),
    ).toBe("/competition/demo-cup/matches?view=results&page=2");
    expect(() => competitionHref("../private")).toThrow();
  });
  it("requires a parent stage and bounded unambiguous pagination", () => {
    for (const value of [
      { group: "a" },
      { page: "0" },
      { page: "-1" },
      { page: "1.5" },
      { page: "99999" },
      { page: "1e3" },
      { stage: ["a", "b"] },
      { unknown: "true" },
    ])
      expect(competitionQuerySchema.safeParse(value).success).toBe(false);
    expect(
      competitionQuerySchema.parse({ stage: "groups", group: "a", page: "2" })
        .page,
    ).toBe(2);
    expect(directoryQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(
      false,
    );
  });
  it("selects an active season, then the latest started or earliest future season", () => {
    const past = { startsOn: "2025-07-01", endsOn: "2026-06-30" };
    const active = { startsOn: "2026-07-01", endsOn: "2027-06-30" };
    const future = { startsOn: "2027-07-01", endsOn: "2028-06-30" };
    expect(defaultSeason([future, past, active], "2026-09-16")).toEqual(active);
    expect(defaultSeason([past, future], "2026-09-16")).toEqual(past);
    expect(defaultSeason([future, active], "2020-01-01")).toEqual(active);
    expect(defaultSeason([past, active], "2026-06-30")).toEqual(past);
    expect(defaultSeason([], "2026-09-16")).toBeNull();
  });
});
describe("Competition API boundaries", () => {
  const request = (query: string) =>
    new Request(`http://localhost/api/v1/competitions/demo-cup${query}`);
  it("passes normalized scope and returns no-store DTOs", async () => {
    service.page.mockResolvedValue({ competition: { name: "Sample Cup" } });
    const response = await competitionPageResponse(
      request(
        "?season=2025-26&section=matches&stage=groups&group=a&view=results&page=2",
      ),
      "demo-cup",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(service.page).toHaveBeenCalledWith(
      "demo-cup",
      "2025-26",
      "matches",
      { stage: "groups", group: "a", view: "results", page: 2 },
    );
  });
  it.each([
    "?section=stats&section=matches",
    "?season=../",
    "?section=squad",
    "?group=a",
    "?page=0",
    "?secret=x",
    "?stage=a&stage=b",
  ])("rejects invalid selection %s before storage", async (query) => {
    expect(
      (await competitionPageResponse(request(query), "demo-cup")).status,
    ).toBe(400);
    expect(service.page).not.toHaveBeenCalled();
  });
  it("distinguishes missing selections from unavailable infrastructure without leaking errors", async () => {
    service.page.mockResolvedValue(null);
    expect(
      (await competitionPageResponse(request(""), "demo-cup")).status,
    ).toBe(404);
    service.page.mockRejectedValue(
      new Error("database credential should stay private"),
    );
    const response = await competitionPageResponse(request(""), "demo-cup");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("credential");
    expect((await competitionPageResponse(request(""), "../bad")).status).toBe(
      404,
    );
  });
  it("validates directory filters and sanitizes directory failures", async () => {
    expect(
      (await competitionDirectoryResponse(request("?q=a&q=b"))).status,
    ).toBe(400);
    service.directory.mockResolvedValue({ data: [], count: 0 });
    expect(
      (await competitionDirectoryResponse(request("?q=England&kind=league")))
        .status,
    ).toBe(200);
    expect(service.directory).toHaveBeenCalledWith({
      q: "England",
      kind: "league",
      page: 1,
    });
    service.directory.mockRejectedValue(new Error("private"));
    const response = await competitionDirectoryResponse(request(""));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
});
