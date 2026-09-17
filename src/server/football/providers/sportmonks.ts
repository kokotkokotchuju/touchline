import "server-only";

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
  providerTeamSchema,
  type ProviderMatch,
  type ProviderStanding,
  type ProviderLineup,
  type ProviderMatchEvent,
  type ProviderMatchStats,
  type ProviderPlayer,
  type ProviderPlayerStats,
  type ProviderSquadMember,
} from "./models";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};
const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const array = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(record) : [];
function nestedFixtures(value: unknown): JsonRecord[] {
  const found: JsonRecord[] = [];
  const visit = (entry: unknown) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    const item = record(entry);
    if (item.starting_at && Array.isArray(item.participants)) {
      found.push(item);
      return;
    }
    Object.values(item).forEach(visit);
  };
  visit(value);
  return found;
}
const id = (value: unknown): string | null =>
  typeof value === "number" || typeof value === "string" ? String(value) : null;

function page<T>(data: T[], nextCursor: string | null = null): ProviderPage<T> {
  return { data, nextCursor, fetchedAt: new Date().toISOString() };
}
function date(value: unknown): string | null {
  const valueText = text(value);
  if (!valueText) return null;
  const parsed = new Date(valueText);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}
function dateOnly(value: unknown, fallback: string): string {
  const valueText = text(value);
  return valueText?.slice(0, 10) ?? fallback;
}
function matchStatus(item: JsonRecord): ProviderMatch["status"] {
  const state = text(record(item.state).state) ?? text(item.status) ?? "";
  if (/live|in.?play|half.?time/i.test(state)) return "live";
  if (/finished|complete|ended/i.test(state)) return "finished";
  if (/postpon/i.test(state)) return "postponed";
  if (/cancel|abandon/i.test(state)) return "cancelled";
  return "scheduled";
}
function participant(item: JsonRecord, side: "home" | "away"): JsonRecord {
  const participants = array(item.participants);
  return participants.find((value) => {
    const meta = record(value.meta);
    return side === "home" ? meta.location === "home" : meta.location === "away";
  }) ?? {};
}
function score(item: JsonRecord, side: "home" | "away"): number | null {
  const scores = array(item.scores);
  const value = scores.find((entry) =>
    text(entry.description)?.toLowerCase() === "current" &&
    text(record(entry.participant).meta)?.toLowerCase() === side,
  );
  return number(value?.goals) ?? number(record(item.score)[side]);
}
function mapPlayer(item: JsonRecord): ProviderPlayer {
  const position = text(record(item.position).name ?? item.position);
  return {
    externalId: id(item.id) ?? "unknown",
    name: text(item.display_name ?? item.name) ?? `Player ${item.id}`,
    dateOfBirth: date(item.date_of_birth),
    countryCode: text(record(item.country).iso2),
    position,
  };
}

export class SportmonksProvider implements FootballProvider {
  readonly key = "sportmonks";
  readonly capabilities: ReadonlySet<ProviderCapability> = new Set([
    "competitions", "seasons", "matches", "live", "teams", "standings",
    "squads", "players", "playerStats", "lineups", "events", "matchStats",
  ]);
  private nextRequestAt = 0;

  private async request(path: string, request?: ProviderRequest): Promise<JsonRecord> {
    const config = getServerEnv();
    if (!config.SPORTMONKS_API_TOKEN)
      throw new ProviderError("unauthorized", "SPORTMONKS_API_TOKEN is not configured");
    const base = (config.SPORTMONKS_BASE_URL ?? "https://api.sportmonks.com/v3/football").replace(/\/$/, "");
    const separator = path.includes("?") ? "&" : "?";
    const waitMs = Math.max(0, this.nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + 350;
    let response: Response;
    try {
      response = await fetch(`${base}${path}${separator}api_token=${encodeURIComponent(config.SPORTMONKS_API_TOKEN)}`, {
        signal: request?.signal ?? AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (error) {
      throw new ProviderError("unavailable", error instanceof Error ? error.message : "Sportmonks request failed");
    }
    if (response.status === 401 || response.status === 403)
      throw new ProviderError("unauthorized", "Sportmonks rejected the credentials");
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "2");
      throw new ProviderError(
        "rate_limited",
        "Sportmonks rate limit exceeded",
        Number.isFinite(retryAfter) ? retryAfter : 2,
      );
    }
    if (!response.ok)
      throw new ProviderError("unavailable", `Sportmonks returned HTTP ${response.status}`);
    const payload = record(await response.json());
    if (payload.errors) throw new ProviderError("invalid_payload", "Sportmonks returned an error payload");
    return payload;
  }

  async getCompetitions(request?: ProviderRequest) {
    const payload = await this.request("/leagues", request);
    return page((array(payload.data).map((item) => providerCompetitionSchema.parse({
      externalId: id(item.id),
      name: text(item.name) ?? `League ${item.id}`,
      kind: (text(item.type)?.toLowerCase() === "cup" ? "cup" : "league"),
      countryCode: text(record(item.country).iso2),
      region: text(record(item.country).name) ?? "International",
    }))));
  }
  async getCompetition(idValue: string, request?: ProviderRequest) {
    const payload = await this.request(`/leagues/${encodeURIComponent(idValue)}?include=country`, request);
    const item = record(payload.data);
    if (!item.id) return null;
    return providerCompetitionSchema.parse({
      externalId: id(item.id), name: text(item.name) ?? `League ${item.id}`,
      kind: text(item.type)?.toLowerCase() === "cup" ? "cup" : "league",
      countryCode: text(record(item.country).iso2), region: text(record(item.country).name) ?? "International",
    });
  }
  async getSeasons(competitionId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/seasons?include=league&filters=seasonLeagues:${encodeURIComponent(competitionId)}`,
      request,
    );
    return page(array(payload.data).map((item) => providerSeasonSchema.parse({
      externalId: id(item.id), competitionExternalId: id(item.league_id) ?? competitionId,
      name: text(item.name) ?? dateOnly(item.start_date, String(item.id)),
      startsOn: dateOnly(item.start_date, "2000-01-01"),
      endsOn: dateOnly(item.end_date, "2099-12-31"),
    })));
  }
  private mapMatch(item: JsonRecord, fallbackSeason?: string): ProviderMatch {
    const home = participant(item, "home"), away = participant(item, "away");
    const homeTeam = record(home.image_path ? home : record(home.participant));
    const awayTeam = record(away.image_path ? away : record(away.participant));
    const homeId = id(home.id ?? homeTeam.id), awayId = id(away.id ?? awayTeam.id);
    const kickoff = date(item.starting_at);
    const state = matchStatus(item);
    return providerMatchSchema.parse({
      externalId: id(item.id), seasonExternalId: id(record(item.season).id) ?? fallbackSeason ?? "unknown",
      homeTeamExternalId: homeId ?? "unknown-home", homeTeamName: text(home.name ?? homeTeam.name) ?? undefined,
      homeTeamLogoUrl: text(home.image_path ?? homeTeam.image_path),
      awayTeamExternalId: awayId ?? "unknown-away", awayTeamName: text(away.name ?? awayTeam.name) ?? undefined,
      awayTeamLogoUrl: text(away.image_path ?? awayTeam.image_path),
      kickoffAt: kickoff, status: state, homeScore: score(item, "home"), awayScore: score(item, "away"),
      minute: number(record(item.periods).minute) ?? null, round: text(record(item.round).name),
      venueName: text(record(item.venue).name), observedAt: new Date().toISOString(),
    });
  }
  async getMatches(filters: ProviderMatchFilters, request?: ProviderRequest) {
    const query = new URLSearchParams({ include: "participants;scores;league;season;venue", sort: "starting_at" });
    if (filters.seasonId) {
      const payload = await this.request(
        `/schedules/seasons/${encodeURIComponent(filters.seasonId)}`,
        request,
      );
      const fixtures = nestedFixtures(payload.data).filter((item) =>
        !filters.competitionId ||
        id(record(item.league).id ?? item.league_id) === filters.competitionId,
      );
      let data = fixtures.map((item) => this.mapMatch(item, filters.seasonId));
      if (filters.teamId) {
        data = data.filter((item) =>
          item.homeTeamExternalId === filters.teamId ||
          item.awayTeamExternalId === filters.teamId,
        );
      }
      return page(data);
    }
    const start = new Date(filters.from);
    const end = new Date(filters.to);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end)
      throw new ProviderError("invalid_payload", "SportMonks fixture date range is invalid");
    const fixtures: JsonRecord[] = [];
    for (let cursor = start; cursor <= end; ) {
      const chunkEnd = new Date(Math.min(
        end.valueOf(),
        cursor.valueOf() + 89 * 24 * 60 * 60 * 1000,
      ));
      const from = cursor.toISOString().slice(0, 10);
      const to = chunkEnd.toISOString().slice(0, 10);
      const payload = await this.request(
        `/fixtures/between/${from}/${to}?${query}`,
        request,
      );
      fixtures.push(
        ...array(payload.data).filter((item) =>
          !filters.competitionId ||
          id(record(item.league).id ?? item.league_id) === filters.competitionId,
        ),
      );
      cursor = new Date(chunkEnd.valueOf() + 24 * 60 * 60 * 1000);
    }
    let data = fixtures.map((item) => this.mapMatch(item, filters.seasonId));
    if (filters.teamId) {
      data = data.filter((item) =>
        item.homeTeamExternalId === filters.teamId ||
        item.awayTeamExternalId === filters.teamId,
      );
    }
    return page(data);
  }
  async getMatch(idValue: string, request?: ProviderRequest) {
    const payload = await this.request(`/fixtures/${encodeURIComponent(idValue)}?include=participants;scores;league;season;venue`, request);
    return payload.data ? this.mapMatch(record(payload.data)) : null;
  }
  async getLiveMatches(request?: ProviderRequest) {
    const payload = await this.request("/livescores/latest?include=participants;scores;league;season;venue", request);
    return page(array(payload.data).map((item) => this.mapMatch(item)));
  }
  async getStandings(competitionId: string, seasonId: string, request?: ProviderRequest) {
    const payload = await this.request(`/standings/seasons/${encodeURIComponent(seasonId)}?include=participant`, request);
    return page(array(payload.data).map((item): ProviderStanding => ({
      teamExternalId: id(record(item.participant).id ?? item.participant_id) ?? "unknown",
      group: text(item.group_name), rank: number(item.position) ?? number(item.rank) ?? 0,
      played: number(item.games_played) ?? number(item.played) ?? 0,
      won: number(item.won) ?? 0, drawn: number(item.draw) ?? number(item.drawn) ?? 0,
      lost: number(item.lost) ?? 0, goalsFor: number(item.goals_for) ?? 0,
      goalsAgainst: number(item.goals_against) ?? 0, points: number(item.points) ?? 0,
    })));
  }
  async getTeam(idValue: string, request?: ProviderRequest) {
    const payload = await this.request(`/teams/${encodeURIComponent(idValue)}?include=country`, request);
    const item = record(payload.data);
    if (!item.id) return null;
    return providerTeamSchema.parse({
      externalId: id(item.id), name: text(item.name) ?? `Team ${item.id}`,
      shortName: text(item.short_code ?? item.short_name ?? item.name) ?? `Team ${item.id}`,
      logoUrl: text(item.image_path), kind: "club", countryCode: text(record(item.country).iso2),
    });
  }
  async getTeamMatches(idValue: string, filters: ProviderMatchFilters, request?: ProviderRequest) {
    return this.getMatches({ ...filters, teamId: idValue }, request);
  }
  async getPlayerLeaderboard(competitionId: string, seasonId: string, category: ProviderLeaderboardCategory, request?: ProviderRequest) {
    const payload = await this.request(
      `/topscorers/seasons/${encodeURIComponent(seasonId)}?include=player;participant`,
      request,
    );
    const key = category === "goals" ? "goals" : category;
    return page(array(payload.data).map((item) => ({
      playerExternalId: id(record(item.player).id ?? item.player_id) ?? "unknown",
      playerName: text(record(item.player).display_name ?? record(item.player).name) ?? "Unknown player",
      teamExternalId: id(record(item.participant).id ?? item.participant_id) ?? competitionId,
      teamName: text(record(item.participant).name) ?? "Unknown team",
      value: number(item[key]) ?? number(item.total) ?? 0,
    })));
  }
  async getTeamSquad(idValue: string, seasonId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/squads/seasons/${encodeURIComponent(seasonId)}/teams/${encodeURIComponent(idValue)}?include=player;player.country`,
      request,
    );
    return page(array(payload.data).map((item): ProviderSquadMember => ({
      player: mapPlayer(record(item.player).id ? record(item.player) : item),
      shirtNumber: number(item.jersey_number ?? item.shirt_number),
      joinedOn: dateOnly(item.start_date, "2000-01-01"),
      leftOn: text(item.end_date) ? dateOnly(item.end_date, "2099-12-31") : null,
    })));
  }
  async getPlayer(idValue: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/players/${encodeURIComponent(idValue)}?include=country;position`,
      request,
    );
    return payload.data ? mapPlayer(record(payload.data)) : null;
  }
  async getPlayerStats(idValue: string, seasonId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/players/${encodeURIComponent(idValue)}/statistics/seasons/${encodeURIComponent(seasonId)}?include=player;participant`,
      request,
    );
    return page(array(payload.data).map((item): ProviderPlayerStats => ({
      playerExternalId: idValue,
      seasonExternalId: seasonId,
      teamExternalId: id(record(item.participant).id ?? item.participant_id) ?? "unknown",
      appearances: number(item.appearances ?? item.appearances_total),
      minutes: number(item.minutes),
      goals: number(item.goals ?? item.goals_total),
      assists: number(item.assists ?? item.assists_total),
      yellowCards: number(item.yellowcards ?? item.yellow_cards),
      redCards: number(item.redcards ?? item.red_cards),
    })));
  }
  async getLineups(matchId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/fixtures/${encodeURIComponent(matchId)}?include=lineups;lineups.player;lineups.position`,
      request,
    );
    const grouped = new Map<string, ProviderLineup>();
    for (const item of array(record(payload.data).lineups)) {
      const teamId = id(item.team_id ?? record(item.team).id) ?? "unknown";
      const current = grouped.get(teamId) ?? {
        teamExternalId: teamId,
        formation: text(item.formation),
        confirmed: true,
        players: [],
      };
      current.players.push({
        playerExternalId: id(record(item.player).id ?? item.player_id) ?? "unknown",
        playerName: text(record(item.player).display_name ?? record(item.player).name),
        starter: text(item.type)?.toLowerCase() === "starting_xi" || item.starter === true,
        shirtNumber: number(item.jersey_number ?? item.shirt_number),
        position: text(record(item.position).name ?? item.position),
      });
      grouped.set(teamId, current);
    }
    return page([...grouped.values()]);
  }
  async getMatchEvents(matchId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/fixtures/${encodeURIComponent(matchId)}?include=events;events.player;events.participant`,
      request,
    );
    return page(array(record(payload.data).events).map((item): ProviderMatchEvent => ({
      externalId: id(item.id) ?? `${matchId}-${item.minute}-${item.type_id}`,
      teamExternalId: id(record(item.participant).id ?? item.participant_id),
      playerExternalId: id(record(item.player).id ?? item.player_id),
      relatedPlayerExternalId: id(record(item.related_player).id ?? item.related_player_id),
      minute: number(item.minute) ?? 0,
      addedMinute: number(item.extra_minute ?? item.added_time),
      kind: text(record(item.type).code ?? item.type)?.toLowerCase().includes("goal") ? "goal" : "other",
      detail: text(item.result ?? item.info),
    })));
  }
  async getMatchStats(matchId: string, request?: ProviderRequest) {
    const payload = await this.request(
      `/fixtures/${encodeURIComponent(matchId)}?include=statistics;statistics.type`,
      request,
    );
    return page(array(record(payload.data).statistics).map((item): ProviderMatchStats => {
      const stats = record(item.statistics);
      const value = (key: string) => number(stats[key] ?? item[key]);
      return {
        teamExternalId: id(item.team_id ?? record(item.participant).id) ?? "unknown",
        period: "full_match",
        possessionPercent: value("possession"),
        shots: value("shots"),
        shotsOnTarget: value("shots_on_target"),
        corners: value("corners"),
        fouls: value("fouls"),
        expectedGoals: value("expected_goals"),
      };
    }));
  }
}
