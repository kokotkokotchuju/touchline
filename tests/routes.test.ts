import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";

describe("Future public URL contract", () => {
  it("keeps a match identity independent of provider and JavaScript integer precision", () => {
    expect(routes.match("real-madrid", "barcelona", "9007199254740993")).toBe(
      "/match/real-madrid-vs-barcelona-9007199254740993",
    );
    expect(
      routes.competitionSeason("premier-league", "2026-27", "standings"),
    ).toBe("/competition/premier-league/season/2026-27/standings");
  });
  it("rejects invalid dates and unsafe path segments", () => {
    expect(routes.matches("2028-02-29")).toBe("/matches/2028-02-29");
    expect(() => routes.matches("2026-02-29")).toThrow();
    expect(() => routes.team("../search?q=oops")).toThrow();
    expect(() => routes.match("home", "away", "-4")).toThrow();
  });
  it("encodes a search query as one value", () => {
    expect(routes.search(" Atlético & Real ")).toBe(
      "/search?q=Atl%C3%A9tico+%26+Real",
    );
  });
});
