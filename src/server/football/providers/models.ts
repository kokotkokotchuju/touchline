import { z } from "zod";

// These are OUR ingestion models. Adapters map external JSON into these shapes.
// externalId only locates a provider record; SQL resolves internal UUIDs through
// external_references. No external IDs or raw JSON form the public API contract.
const externalId = z.string().trim().min(1);
const score = z.number().int().nonnegative().nullable();
export const providerCompetitionSchema = z.object({
  externalId,
  name: z.string().min(1),
  kind: z.enum(["league", "cup", "international"]),
  countryCode: z.string().nullable(),
  region: z.string().min(1),
});
export const providerSeasonSchema = z
  .object({
    externalId,
    competitionExternalId: externalId,
    name: z.string().min(1),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
  })
  .refine(
    (value) => value.endsOn >= value.startsOn,
    "Season end must not precede its start",
  );
export const providerTeamSchema = z.object({
  externalId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  logoUrl: z.string().url().nullable(),
  kind: z.enum(["club", "national"]),
  countryCode: z.string().nullable(),
});
export const providerMatchSchema = z
  .object({
    externalId,
    seasonExternalId: externalId,
    homeTeamExternalId: externalId,
    homeTeamName: z.string().min(1).optional(),
    homeTeamLogoUrl: z.string().url().nullable().optional(),
    awayTeamExternalId: externalId,
    awayTeamName: z.string().min(1).optional(),
    awayTeamLogoUrl: z.string().url().nullable().optional(),
    kickoffAt: z.iso.datetime({ offset: true }).nullable(),
    status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]),
    homeScore: score,
    awayScore: score,
    minute: z.number().int().nonnegative().nullable(),
    round: z.string().nullable(),
    venueName: z.string().nullable(),
    observedAt: z.iso.datetime({ offset: true }),
  })
  .refine(
    (value) => value.homeTeamExternalId !== value.awayTeamExternalId,
    "A team cannot play itself",
  )
  .refine(
    (value) => (value.homeScore === null) === (value.awayScore === null),
    "Scores must be supplied together",
  );

export type ProviderCompetition = z.infer<typeof providerCompetitionSchema>;
export type ProviderSeason = z.infer<typeof providerSeasonSchema>;
export type ProviderTeam = z.infer<typeof providerTeamSchema>;
export type ProviderMatch = z.infer<typeof providerMatchSchema>;

// Contracts for future phases, without premature persistence or feature code.
export interface ProviderPlayer {
  externalId: string;
  name: string;
  dateOfBirth: string | null;
  countryCode: string | null;
  position: string | null;
}
export interface ProviderStanding {
  teamExternalId: string;
  group: string | null;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}
export interface ProviderSquadMember {
  player: ProviderPlayer;
  shirtNumber: number | null;
  joinedOn: string | null;
  leftOn: string | null;
}
export interface ProviderPlayerStats {
  playerExternalId: string;
  seasonExternalId: string;
  teamExternalId: string;
  appearances: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
}
export interface ProviderLineup {
  teamExternalId: string;
  formation: string | null;
  confirmed: boolean;
  players: {
    playerExternalId: string;
    playerName?: string | null;
    starter: boolean;
    shirtNumber: number | null;
    position: string | null;
  }[];
}
export interface ProviderMatchEvent {
  externalId: string;
  teamExternalId: string | null;
  playerExternalId: string | null;
  relatedPlayerExternalId: string | null;
  minute: number;
  addedMinute: number | null;
  kind:
    | "goal"
    | "own_goal"
    | "penalty"
    | "yellow_card"
    | "red_card"
    | "substitution"
    | "var"
    | "other";
  detail: string | null;
}
export interface ProviderMatchStats {
  teamExternalId: string;
  period: "full_match" | "first_half" | "second_half" | "extra_time";
  possessionPercent: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  expectedGoals: number | null;
}
