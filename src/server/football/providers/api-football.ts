import "server-only";

import { z } from "zod";
import {
  providerCompetitionSchema,
  providerMatchSchema,
  providerSeasonSchema,
  type ProviderCompetition,
  type ProviderMatch,
  type ProviderSeason,
  type ProviderStanding,
} from "./models";
import {
  ProviderError,
  type FootballProvider,
  type ProviderMatchFilters,
  type ProviderLeaderboardCategory,
  type ProviderLeaderboardRow,
  type ProviderPage,
  type ProviderRequest,
} from "./football-provider";
import { getServerEnv } from "@/server/env";

const responseItem = z.object({
  league: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    logo: z.string().nullable().optional(),
  }),
  country: z.object({
    name: z.string(),
    code: z.string().nullable().optional(),
    flag: z.string().nullable().optional(),
  }),
});

const fixture = z.object({
  fixture: z.object({
    id: z.number(),
    date: z.string().nullable(),
    status: z.object({
      short: z.string(),
      elapsed: z.number().nullable().optional(),
      extra: z.number().nullable().optional(),
    }),
    venue: z
      .object({ name: z.string().nullable().optional() })
      .nullable()
      .optional(),
  }),
  league: z.object({
    id: z.number(),
    season: z.number(),
    round: z.string().nullable().optional(),
  }),
  teams: z.object({
    home: z.object({ id: z.number(), name: z.string() }),
    away: z.object({ id: z.number(), name: z.string() }),
  }),
  goals: z.object({ home: z.number().nullable(), away: z.number().nullable() }),
});

const season = z.object({
  year: z.number(),
  start: z.string(),
  end: z.string(),
});
const standings = z.object({
  rank: z.number(),
  team: z.object({ id: z.number() }),
  points: z.number(),
  goalsDiff: z.number(),
  all: z.object({
    played: z.number(),
    win: z.number(),
    draw: z.number(),
    lose: z.number(),
    goals: z.object({ for: z.number(), against: z.number() }),
  }),
});
const leaderboardPlayer = z.object({
  player: z.object({ id: z.number(), name: z.string() }),
  statistics: z
    .array(
      z.object({
        team: z.object({ id: z.number(), name: z.string() }),
        goals: z
          .object({
            total: z.number().nullable(),
            assists: z.number().nullable(),
          })
          .optional(),
        cards: z
          .object({ yellow: z.number().nullable(), red: z.number().nullable() })
          .optional(),
      }),
    )
    .min(1),
});

function page<T>(data: T[]): ProviderPage<T> {
  return { data, nextCursor: null, fetchedAt: new Date().toISOString() };
}

function status(value: string): ProviderMatch["status"] {
  if (["1H", "2H", "ET", "P", "LIVE"].includes(value)) return "live";
  if (value === "HT") return "live";
  if (["FT", "AET", "PEN"].includes(value)) return "finished";
  if (["PST", "CANC", "ABD"].includes(value))
    return value === "PST" ? "postponed" : "cancelled";
  return "scheduled";
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export class ApiFootballProvider implements FootballProvider {
  readonly key = "api-football";
  readonly capabilities = new Set([
    "competitions",
    "seasons",
    "matches",
    "live",
    "teams",
    "standings",
    "leaderboards",
  ] as const);

  private async request(
    path: string,
    request?: ProviderRequest,
  ): Promise<unknown[]> {
    const config = getServerEnv();
    if (!config.API_FOOTBALL_KEY) {
      throw new ProviderError(
        "unauthorized",
        "API_FOOTBALL_KEY is not configured",
      );
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(
          `${config.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io"}${path}`,
          {
            headers: { "x-apisports-key": config.API_FOOTBALL_KEY },
            signal: request?.signal ?? controller.signal,
            cache: "no-store",
          },
        );
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError(
            "unauthorized",
            "API-Football rejected the credentials",
          );
        }
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          if (attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(retryAfter * 1000, 5000)),
            );
            continue;
          }
          throw new ProviderError(
            "rate_limited",
            "API-Football rate limit exceeded",
            retryAfter,
          );
        }
        if (response.status >= 500 && attempt < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * 2 ** attempt),
          );
          continue;
        }
        if (!response.ok) {
          throw new ProviderError(
            "unavailable",
            `API-Football returned HTTP ${response.status}`,
          );
        }
        const payload = z
          .object({
            response: z.array(z.unknown()),
            errors: z.unknown().optional(),
          })
          .parse(await response.json());
        if (payload.errors !== undefined) {
          const errors = Array.isArray(payload.errors)
            ? payload.errors
            : typeof payload.errors === "object" && payload.errors !== null
              ? Object.entries(payload.errors)
              : [payload.errors];
          if (errors.length > 0) {
            throw new ProviderError(
              "invalid_payload",
              JSON.stringify(payload.errors),
            );
          }
        }
        return payload.response;
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        if (attempt === 2) {
          throw new ProviderError(
            "unavailable",
            error instanceof Error ? error.message : "Provider request failed",
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new ProviderError(
      "unavailable",
      "Provider request failed after retries",
    );
  }

  async getCompetitions(request?: ProviderRequest) {
    const rows = (await this.request("/leagues", request)).map((row) =>
      responseItem.parse(row),
    );
    return page<ProviderCompetition>(
      rows.map((row) =>
        providerCompetitionSchema.parse({
          externalId: String(row.league.id),
          name: row.league.name,
          kind: row.league.type.toLowerCase() === "league" ? "league" : "cup",
          countryCode: row.country.code ?? null,
          region: row.country.name,
        }),
      ),
    );
  }

  async getCompetition(id: string, request?: ProviderRequest) {
    return (
      (await this.getCompetitions(request)).data.find(
        (item) => item.externalId === id,
      ) ?? null
    );
  }

  async getSeasons(competitionId: string, request?: ProviderRequest) {
    const rows = await this.request(
      `/leagues?id=${encodeURIComponent(competitionId)}`,
      request,
    );
    const parsed = z
      .object({ seasons: z.array(season) })
      .parse((rows[0] as { seasons?: unknown }) ?? {});
    return page<ProviderSeason>(
      parsed.seasons.map((item) =>
        providerSeasonSchema.parse({
          externalId: `${competitionId}:${item.year}`,
          competitionExternalId: competitionId,
          name: String(item.year),
          startsOn: dateOnly(item.start),
          endsOn: dateOnly(item.end),
        }),
      ),
    );
  }

  async getMatches(filters: ProviderMatchFilters, request?: ProviderRequest) {
    const params = new URLSearchParams({ from: filters.from, to: filters.to });
    if (filters.competitionId) params.set("league", filters.competitionId);
    if (filters.seasonId)
      params.set(
        "season",
        filters.seasonId.split(":").at(-1) ?? filters.seasonId,
      );
    if (filters.teamId) params.set("team", filters.teamId);
    return page<ProviderMatch>(
      this.parseFixtures(await this.request(`/fixtures?${params}`, request)),
    );
  }

  async getLiveMatches(request?: ProviderRequest) {
    return page<ProviderMatch>(
      this.parseFixtures(await this.request("/fixtures?live=all", request)),
    );
  }

  async getMatch(id: string, request?: ProviderRequest) {
    return (
      (
        await this.getMatches({ from: "2000-01-01", to: "2100-01-01" }, request)
      ).data.find((item) => item.externalId === id) ?? null
    );
  }

  private parseFixtures(rows: unknown[]) {
    return rows.map((row) => {
      const item = fixture.parse(row);
      return providerMatchSchema.parse({
        externalId: String(item.fixture.id),
        seasonExternalId: `${item.league.id}:${item.league.season}`,
        homeTeamExternalId: String(item.teams.home.id),
        homeTeamName: item.teams.home.name,
        awayTeamExternalId: String(item.teams.away.id),
        awayTeamName: item.teams.away.name,
        kickoffAt: item.fixture.date
          ? new Date(item.fixture.date).toISOString()
          : null,
        status: status(item.fixture.status.short),
        homeScore: item.goals.home,
        awayScore: item.goals.away,
        minute: item.fixture.status.elapsed ?? null,
        round: item.league.round ?? null,
        venueName: item.fixture.venue?.name ?? null,
        observedAt: new Date().toISOString(),
      });
    });
  }

  async getStandings(
    competitionId: string,
    seasonId: string,
    request?: ProviderRequest,
  ) {
    const year = seasonId.split(":").at(-1) ?? seasonId;
    const rows = await this.request(
      `/standings?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(year)}`,
      request,
    );
    const lists = z
      .array(
        z.object({
          league: z.object({ standings: z.array(z.array(standings)) }),
        }),
      )
      .parse(rows);
    return page<ProviderStanding>(
      lists
        .flatMap((row) => row.league.standings.flat())
        .map((item) => ({
          teamExternalId: String(item.team.id),
          group: null,
          rank: item.rank,
          played: item.all.played,
          won: item.all.win,
          drawn: item.all.draw,
          lost: item.all.lose,
          goalsFor: item.all.goals.for,
          goalsAgainst: item.all.goals.against,
          points: item.points,
        })),
    );
  }

  async getPlayerLeaderboard(
    competitionId: string,
    seasonId: string,
    category: ProviderLeaderboardCategory,
    request?: ProviderRequest,
  ) {
    const endpoint =
      category === "goals"
        ? "topscorers"
        : category === "assists"
          ? "topassists"
          : category === "yellow_cards"
            ? "topyellowcards"
            : "topredcards";
    const rows = (
      await this.request(
        `/players/${endpoint}?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(seasonId.split(":").at(-1) ?? seasonId)}`,
        request,
      )
    ).map((row) => leaderboardPlayer.parse(row));
    return page<ProviderLeaderboardRow>(
      rows.flatMap((row) => {
        const statistic = row.statistics[0];
        const value =
          category === "goals"
            ? statistic.goals?.total
            : category === "assists"
              ? statistic.goals?.assists
              : category === "yellow_cards"
                ? statistic.cards?.yellow
                : statistic.cards?.red;
        return value == null
          ? []
          : [
              {
                playerExternalId: String(row.player.id),
                playerName: row.player.name,
                teamExternalId: String(statistic.team.id),
                teamName: statistic.team.name,
                value,
              },
            ];
      }),
    );
  }

  async getTeam(id: string): Promise<null> {
    throw new ProviderError(
      "unsupported",
      `Team lookup ${id} is not enabled yet`,
    );
  }
  async getTeamMatches(
    id: string,
    filters: ProviderMatchFilters,
    request?: ProviderRequest,
  ) {
    return this.getMatches({ ...filters, teamId: id }, request);
  }
  async getTeamSquad(): Promise<never> {
    throw new ProviderError("unsupported", "Squads are not enabled yet");
  }
  async getPlayer(): Promise<null> {
    throw new ProviderError("unsupported", "Players are not enabled yet");
  }
  async getPlayerStats(): Promise<never> {
    throw new ProviderError(
      "unsupported",
      "Player statistics are not enabled yet",
    );
  }
  async getLineups(): Promise<never> {
    throw new ProviderError("unsupported", "Lineups are not enabled yet");
  }
  async getMatchEvents(): Promise<never> {
    throw new ProviderError("unsupported", "Events are not enabled yet");
  }
  async getMatchStats(): Promise<never> {
    throw new ProviderError(
      "unsupported",
      "Match statistics are not enabled yet",
    );
  }
}
