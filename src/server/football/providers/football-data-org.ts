import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/server/env";
import {
  ProviderError,
  type FootballProvider,
  type ProviderCapability,
  type ProviderLeaderboardCategory,
  type ProviderMatchFilters,
  type ProviderPage,
  type ProviderRequest,
} from "./football-provider";
import {
  providerCompetitionSchema,
  providerMatchSchema,
  providerSeasonSchema,
  type ProviderCompetition,
  type ProviderMatch,
  type ProviderSeason,
  type ProviderStanding,
  type ProviderTeam,
} from "./models";

const competition = z.object({
  id: z.number(),
  code: z.string().nullable().optional(),
  name: z.string(),
  type: z.string().optional(),
  area: z.object({ code: z.string().nullable().optional(), name: z.string() }),
  currentSeason: z.object({
    id: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
});
const competitionList = z.object({ competitions: z.array(competition) });
const match = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  matchday: z.number().nullable().optional(),
  homeTeam: z.object({ id: z.number(), name: z.string(), shortName: z.string().nullable().optional(), crest: z.string().url().nullable().optional() }),
  awayTeam: z.object({ id: z.number(), name: z.string(), shortName: z.string().nullable().optional(), crest: z.string().url().nullable().optional() }),
  score: z.object({ fullTime: z.object({ home: z.number().nullable(), away: z.number().nullable() }) }),
});
const matchesResponse = z.object({ matches: z.array(match) });
const standingsResponse = z.object({
  standings: z.array(z.object({
    type: z.string(),
    table: z.array(z.object({
      position: z.number(),
      team: z.object({ id: z.number() }),
      playedGames: z.number(),
      won: z.number(),
      draw: z.number(),
      lost: z.number(),
      goalsFor: z.number(),
      goalsAgainst: z.number(),
      goalDifference: z.number(),
      points: z.number(),
    })),
  })),
});

function page<T>(data: T[]): ProviderPage<T> {
  return { data, nextCursor: null, fetchedAt: new Date().toISOString() };
}

function status(value: string): ProviderMatch["status"] {
  if (["IN_PLAY", "PAUSED", "SUSPENDED"].includes(value)) return "live";
  if (["FINISHED", "AWARDED"].includes(value)) return "finished";
  if (["POSTPONED", "CANCELLED"].includes(value)) return value.toLowerCase() as "postponed" | "cancelled";
  return "scheduled";
}

function crestUrl(id: number, crest: string | null | undefined): string {
  return crest ?? `https://crests.football-data.org/${id}.png`;
}

function unsupported<T>(): Promise<T> {
  return Promise.reject(new ProviderError("unsupported", "football-data.org does not provide this capability through this adapter"));
}

let nextAllowedRequestAt = 0;

export class FootballDataOrgProvider implements FootballProvider {
  readonly key = "football-data-org";
  readonly capabilities: ReadonlySet<ProviderCapability> = new Set([
    "competitions", "seasons", "matches", "live", "teams", "standings",
  ]);

  private async request(path: string, request?: ProviderRequest): Promise<unknown> {
    const config = getServerEnv();
    if (!config.FOOTBALL_DATA_TOKEN) {
      throw new ProviderError("unauthorized", "FOOTBALL_DATA_TOKEN is not configured");
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const waitMs = Math.max(0, nextAllowedRequestAt - Date.now());
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      nextAllowedRequestAt = Date.now() + 6_100;
      try {
        const response = await fetch(`https://api.football-data.org/v4${path}`, {
          headers: { "X-Auth-Token": config.FOOTBALL_DATA_TOKEN },
          signal: request?.signal ?? AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError("unauthorized", "football-data.org rejected the credentials");
        }
        if (response.status === 429) {
          throw new ProviderError("rate_limited", "football-data.org rate limit exceeded");
        }
        if (!response.ok) {
          throw new ProviderError("unavailable", `football-data.org returned HTTP ${response.status}`);
        }
        return response.json();
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        if (attempt === 2) {
          throw new ProviderError(
            "unavailable",
            error instanceof Error ? error.message : "football-data.org request failed",
          );
        }
      }
    }
    throw new ProviderError("unavailable", "football-data.org request failed after retries");
  }

  async getCompetitions(request?: ProviderRequest) {
    const data = competitionList.parse(await this.request("/competitions", request)).competitions;
    return page<ProviderCompetition>(data.map((item) => providerCompetitionSchema.parse({
      externalId: item.code ?? String(item.id),
      name: item.name,
      kind: item.type === "LEAGUE" ? "league" : "cup",
      countryCode: item.area.code ?? null,
      region: item.area.name,
    })));
  }

  async getCompetition(id: string, request?: ProviderRequest) {
    return (await this.getCompetitions(request)).data.find((item) => item.externalId === id) ?? null;
  }

  async getSeasons(competitionId: string, request?: ProviderRequest) {
    const item = competition.parse(await this.request(`/competitions/${encodeURIComponent(competitionId)}`, request));
    if (!item.currentSeason) return page<ProviderSeason>([]);
    return page([providerSeasonSchema.parse({
      externalId: `${competitionId}:${item.currentSeason.id}`,
      competitionExternalId: competitionId,
      name: item.currentSeason.startDate.slice(0, 4),
      startsOn: item.currentSeason.startDate,
      endsOn: item.currentSeason.endDate,
    })]);
  }

  async getMatches(filters: ProviderMatchFilters, request?: ProviderRequest) {
    const params = new URLSearchParams({ dateFrom: filters.from, dateTo: filters.to });
    const competitionId = filters.competitionId ? `/competitions/${encodeURIComponent(filters.competitionId)}` : "/matches";
    const data = matchesResponse.parse(await this.request(`${competitionId}/matches?${params}`, request)).matches;
    return page<ProviderMatch>(data.map((item) => providerMatchSchema.parse({
      externalId: String(item.id),
      seasonExternalId: filters.seasonId ?? `${filters.competitionId ?? "all"}:current`,
      homeTeamExternalId: String(item.homeTeam.id),
      homeTeamName: item.homeTeam.name,
      homeTeamLogoUrl: crestUrl(item.homeTeam.id, item.homeTeam.crest),
      awayTeamExternalId: String(item.awayTeam.id),
      awayTeamName: item.awayTeam.name,
      awayTeamLogoUrl: crestUrl(item.awayTeam.id, item.awayTeam.crest),
      kickoffAt: new Date(item.utcDate).toISOString(),
      status: status(item.status),
      homeScore: item.score.fullTime.home,
      awayScore: item.score.fullTime.away,
      minute: status(item.status) === "live" ? 0 : null,
      round: item.matchday ? `Matchday ${item.matchday}` : null,
      venueName: null,
      observedAt: new Date().toISOString(),
    })));
  }

  async getLiveMatches(request?: ProviderRequest) {
    const config = getServerEnv();
    const competitions = (config.FOOTBALL_DATA_COMPETITIONS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const path = competitions.length === 1
      ? `/competitions/${encodeURIComponent(competitions[0])}/matches?status=IN_PLAY`
      : "/matches?status=IN_PLAY";
    const data = matchesResponse.parse(await this.request(path, request)).matches;
    return page<ProviderMatch>(data.map((item) => providerMatchSchema.parse({
      externalId: String(item.id),
      seasonExternalId: `${competitions[0] ?? "all"}:current`,
      homeTeamExternalId: String(item.homeTeam.id),
      homeTeamName: item.homeTeam.name,
      homeTeamLogoUrl: crestUrl(item.homeTeam.id, item.homeTeam.crest),
      awayTeamExternalId: String(item.awayTeam.id),
      awayTeamName: item.awayTeam.name,
      awayTeamLogoUrl: crestUrl(item.awayTeam.id, item.awayTeam.crest),
      kickoffAt: new Date(item.utcDate).toISOString(),
      status: status(item.status),
      homeScore: item.score.fullTime.home,
      awayScore: item.score.fullTime.away,
      minute: status(item.status) === "live" ? 0 : null,
      round: item.matchday ? `Matchday ${item.matchday}` : null,
      venueName: null,
      observedAt: new Date().toISOString(),
    })));
  }

  async getMatch(): Promise<ProviderMatch | null> { return unsupported(); }

  async getStandings(competitionId: string, _seasonId: string, request?: ProviderRequest) {
    const data = standingsResponse.parse(await this.request(`/competitions/${encodeURIComponent(competitionId)}/standings`, request));
    const table = data.standings.find((entry) => entry.type === "TOTAL")?.table ?? data.standings[0]?.table ?? [];
    return page<ProviderStanding>(table.map((item) => ({
      teamExternalId: String(item.team.id),
      group: null,
      rank: item.position,
      played: item.playedGames,
      won: item.won,
      drawn: item.draw,
      lost: item.lost,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      points: item.points,
    })));
  }

  async getTeam(id: string, request?: ProviderRequest): Promise<ProviderTeam | null> {
    const item = z.object({ id: z.number(), name: z.string(), crest: z.string().url().nullable().optional(), shortName: z.string().nullable().optional(), area: z.object({ code: z.string().nullable().optional() }) }).parse(await this.request(`/teams/${encodeURIComponent(id)}`, request));
    return { externalId: String(item.id), name: item.name, shortName: item.shortName ?? item.name, logoUrl: crestUrl(item.id, item.crest), kind: "club", countryCode: item.area.code ?? null };
  }

  getPlayerLeaderboard(_competitionId: string, _seasonId: string, _category: ProviderLeaderboardCategory): Promise<never> { return unsupported(); }
  getTeamMatches(): Promise<never> { return unsupported(); }
  getTeamSquad(): Promise<never> { return unsupported(); }
  getPlayer(): Promise<never> { return unsupported(); }
  getPlayerStats(): Promise<never> { return unsupported(); }
  getLineups(): Promise<never> { return unsupported(); }
  getMatchEvents(): Promise<never> { return unsupported(); }
  getMatchStats(): Promise<never> { return unsupported(); }
}
