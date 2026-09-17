import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dateInTimeZone,
  filterMatches,
  formatKickoff,
  shiftDate,
} from "@/lib/football/filters";
import { DemoFootballRepository } from "@/server/football/repositories/demo-repository";
import { providerMatchSchema } from "@/server/football/providers/models";

afterEach(() => {
  vi.useRealTimers();
});
async function snapshot() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
  return new DemoFootballRepository().getSnapshot();
}
const defaults = {
  date: "2026-09-15",
  timeZone: "UTC",
  status: "all" as const,
  competitionId: "",
  query: "",
  savedOnly: false,
  savedIds: [],
};

describe("Match browsing", () => {
  it("uses UTC dates correctly across a month and leap year", () => {
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("moves late matches to the viewer's next calendar day", () => {
    expect(dateInTimeZone("2026-09-15T23:30:00Z", "Europe/Bratislava")).toBe(
      "2026-09-16",
    );
    expect(dateInTimeZone("2026-09-15T00:30:00Z", "America/New_York")).toBe(
      "2026-09-14",
    );
  });
  it("accounts for the daylight saving clock change", () => {
    expect(formatKickoff("2026-03-29T00:30:00Z", "Europe/Bratislava")).toBe(
      "01:30",
    );
    expect(formatKickoff("2026-03-29T01:30:00Z", "Europe/Bratislava")).toBe(
      "03:30",
    );
  });
  it("combines date, status, competition, search, and saved filters", async () => {
    const data = await snapshot();
    const arsenal = data.matches.find(
      (match) => match.home.id === "arsenal" && match.status === "live",
    )!;
    const result = filterMatches(data.matches, {
      ...defaults,
      status: "live",
      competitionId: "premier-league",
      query: "  ARSENAL  ",
      savedOnly: true,
      savedIds: [arsenal.id],
    });
    expect(result.map((match) => match.id)).toEqual([arsenal.id]);
    expect(
      filterMatches(data.matches, { ...defaults, query: "no-such-team" }),
    ).toEqual([]);
  });
  it("has distinct stable sample IDs, valid competition links, and unknown scheduled scores", async () => {
    const data = await snapshot();
    expect(data.source).toBe("demo");
    expect(data.matches).toHaveLength(60);
    expect(new Set(data.matches.map((match) => match.id)).size).toBe(60);
    for (const match of data.matches) {
      expect(
        data.competitions.some(
          (competition) => competition.id === match.competitionId,
        ),
      ).toBe(true);
      if (match.status === "scheduled") {
        expect(match.homeScore).toBeNull();
        expect(match.awayScore).toBeNull();
      }
    }
    expect(
      filterMatches(data.matches, { ...defaults, status: "live" }),
    ).toHaveLength(3);
  });
});

describe("Provider normalization boundary", () => {
  const match = {
    externalId: "42",
    seasonExternalId: "1",
    homeTeamExternalId: "2",
    awayTeamExternalId: "3",
    kickoffAt: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    minute: null,
    round: null,
    venueName: null,
    observedAt: "2026-09-15T12:00:00Z",
  };
  it("supports announced matches without kickoff or score", () => {
    expect(providerMatchSchema.safeParse(match).success).toBe(true);
  });
  it.each([
    { homeTeamExternalId: "3" },
    { homeScore: -1, awayScore: 0 },
    { homeScore: 1 },
    { kickoffAt: "2026-09-15 12:00" },
    { status: "vendor-unknown-status" },
  ])("rejects invalid normalized payload %j", (change) => {
    expect(providerMatchSchema.safeParse({ ...match, ...change }).success).toBe(
      false,
    );
  });
});
