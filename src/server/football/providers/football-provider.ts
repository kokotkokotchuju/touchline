import type {
  ProviderCompetition,
  ProviderLineup,
  ProviderMatch,
  ProviderMatchEvent,
  ProviderMatchStats,
  ProviderPlayer,
  ProviderPlayerStats,
  ProviderSeason,
  ProviderSquadMember,
  ProviderStanding,
  ProviderTeam,
} from "./models";

export type ProviderCapability =
  | "competitions"
  | "seasons"
  | "matches"
  | "live"
  | "teams"
  | "standings"
  | "squads"
  | "players"
  | "playerStats"
  | "leaderboards"
  | "lineups"
  | "events"
  | "matchStats";
export interface ProviderPage<T> {
  data: T[];
  nextCursor: string | null;
  fetchedAt: string;
}
export interface ProviderRequest {
  signal?: AbortSignal;
  cursor?: string;
}
export interface ProviderMatchFilters {
  from: string;
  to: string;
  competitionId?: string;
  seasonId?: string;
  teamId?: string;
}
export type ProviderLeaderboardCategory =
  "goals" | "assists" | "yellow_cards" | "red_cards";
export interface ProviderLeaderboardRow {
  playerExternalId: string;
  playerName: string;
  teamExternalId: string;
  teamName: string;
  value: number;
}

/**
 * Implementations stay server-only. IDs here are provider-scoped external IDs.
 * Every adapter validates normalized output and advertises its capabilities.
 * Unsupported data throws ProviderError('unsupported'); it is never a fake [].
 * Pagination, cancellation, UTC normalization, and absent data are explicit.
 */
export interface FootballProvider {
  readonly key: string;
  readonly capabilities: ReadonlySet<ProviderCapability>;
  getCompetitions(
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderCompetition>>;
  getCompetition(
    id: string,
    request?: ProviderRequest,
  ): Promise<ProviderCompetition | null>;
  getSeasons(
    competitionId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderSeason>>;
  getMatches(
    filters: ProviderMatchFilters,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderMatch>>;
  getMatch(
    id: string,
    request?: ProviderRequest,
  ): Promise<ProviderMatch | null>;
  getLiveMatches(
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderMatch>>;
  getStandings(
    competitionId: string,
    seasonId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderStanding>>;
  getPlayerLeaderboard(
    competitionId: string,
    seasonId: string,
    category: ProviderLeaderboardCategory,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderLeaderboardRow>>;
  getTeam(id: string, request?: ProviderRequest): Promise<ProviderTeam | null>;
  getTeamMatches(
    id: string,
    filters: ProviderMatchFilters,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderMatch>>;
  getTeamSquad(
    id: string,
    seasonId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderSquadMember>>;
  getPlayer(
    id: string,
    request?: ProviderRequest,
  ): Promise<ProviderPlayer | null>;
  getPlayerStats(
    id: string,
    seasonId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderPlayerStats>>;
  getLineups(
    matchId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderLineup>>;
  getMatchEvents(
    matchId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderMatchEvent>>;
  getMatchStats(
    matchId: string,
    request?: ProviderRequest,
  ): Promise<ProviderPage<ProviderMatchStats>>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code:
      | "unsupported"
      | "unauthorized"
      | "rate_limited"
      | "unavailable"
      | "invalid_payload",
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
