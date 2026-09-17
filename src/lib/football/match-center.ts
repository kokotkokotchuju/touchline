import { z } from "zod";
import { TIME_ZONES, dateInTimeZone } from "./filters";
import type { Team } from "./types";

export const SAMPLE_REFERENCE_DATE = "2026-09-15";
export const MIN_MATCH_DATE = "1800-01-01";
export const MAX_MATCH_DATE = "2200-12-31";
export const matchDateSchema = z.iso
  .date()
  .refine((value) => value >= MIN_MATCH_DATE && value <= MAX_MATCH_DATE);
const slug = z
  .string()
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const matchQuerySchema = z
  .object({
    date: matchDateSchema.optional(),
    status: z.enum(["all", "live", "upcoming", "finished"]).default("all"),
    competition: slug.optional(),
    country: slug.optional(),
    timeZone: z.enum(TIME_ZONES).default("Europe/Bratislava"),
    cursor: z.uuid().optional(),
  })
  .strict();
export type MatchCenterQuery = z.infer<typeof matchQuerySchema>;
export type CenterStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled"
  | "abandoned";
export type Coverage = "UNKNOWN" | "NOT_AVAILABLE" | "PARTIAL" | "COMPLETE";
export interface CenterTeam extends Team {
  slug: string;
  logoUrl: string | null;
}
export interface CenterCompetition {
  id: string;
  slug: string;
  name: string;
  country: { slug: string; code: string; name: string } | null;
  region: string;
}
export interface CenterMatch {
  id: string;
  publicId: string;
  href: string;
  home: CenterTeam;
  away: CenterTeam;
  competition: CenterCompetition;
  season: string;
  round: string | null;
  kickoff: string | null;
  status: CenterStatus;
  minute: number | null;
  addedMinute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  shootout: { home: number; away: number } | null;
  venue: string | null;
  observedAt: string | null;
}
export interface CenterCatalogue {
  competitions: CenterCompetition[];
  countries: { slug: string; name: string; code: string }[];
}
export interface MatchCenterPage {
  data: CenterMatch[];
  undated: CenterMatch[];
  meta: {
    source: "development" | "provider";
    date: string;
    dayTimeZone: "UTC";
    timeZone: string;
    count: number;
    nextCursor: string | null;
    hasMoreUndated: boolean;
    sampleReferenceDate: string;
    readAt: string;
  };
}
export interface CenterEvent {
  id: string;
  sequence: number;
  kind: string;
  status: string;
  teamId: string | null;
  minute: number | null;
  addedMinute: number | null;
  period: string | null;
  player: string | null;
  manager: string | null;
  assist: string | null;
  playerIn: string | null;
  playerOut: string | null;
  detail: string | null;
  relatedEventId: string | null;
}
export interface CenterLineup {
  id: string;
  teamId: string;
  formation: string | null;
  status: string;
  manager: string | null;
  players: {
    id: string;
    name: string;
    role: string;
    position: string | null;
    shirtNumber: number | null;
    captain: boolean;
    x: number | null;
    y: number | null;
  }[];
}
export interface CenterStatistic {
  key: string;
  name: string;
  unit: string;
  valueType: string;
  home: string | null;
  away: string | null;
}
export interface MatchCenterDetail {
  match: CenterMatch;
  coverage: { events: Coverage; lineups: Coverage; statistics: Coverage };
  events: CenterEvent[];
  eventsTruncated: boolean;
  lineups: CenterLineup[];
  statistics: CenterStatistic[];
  scores: { period: string; home: number; away: number }[];
  headToHead: CenterMatch[];
  tie: {
    round: string;
    leg: number | null;
    first: string | null;
    second: string | null;
    firstScore: number | null;
    secondScore: number | null;
    winner: string | null;
  } | null;
  source: "development" | "provider";
}

export function utcToday(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
export function centerKickoff(iso: string, timeZone: string, showDate = false) {
  const includeDate =
    showDate || dateInTimeZone(iso, timeZone) !== iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    ...(includeDate
      ? ({ day: "2-digit", month: "short", year: "numeric" } as const)
      : {}),
  }).format(new Date(iso));
}
function zonedDateToUtc(date: string, timeZone: string) {
  const guess = new Date(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const rendered = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return new Date(guess.getTime() - (rendered - guess.getTime()));
}

export function dateBounds(date: string, timeZone = "UTC") {
  matchDateSchema.parse(date);
  const start = zonedDateToUtc(date, timeZone);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
export function matchesHref(
  date: string,
  query: Partial<MatchCenterQuery> = {},
) {
  const params = new URLSearchParams();
  for (const key of [
    "status",
    "competition",
    "country",
    "timeZone",
    "cursor",
  ] as const) {
    const value = query[key];
    if (value && value !== "all" && value !== "UTC") params.set(key, value);
  }
  return `/matches/${matchDateSchema.parse(date)}${params.size ? `?${params}` : ""}`;
}
export function matchPublicId(segment: string): string | null {
  const result = /-([1-9][0-9]{0,18})$/.exec(segment);
  if (
    !result ||
    segment.length > 380 ||
    BigInt(result[1]) > BigInt("9223372036854775807")
  )
    return null;
  return result[1];
}
export function statusLabel(
  match: Pick<CenterMatch, "status" | "minute" | "addedMinute">,
) {
  if (match.status === "live")
    return match.minute === null
      ? "Live"
      : `${match.minute}${match.addedMinute === null ? "" : `+${match.addedMinute}`}′ · Live`;
  return {
    scheduled: "Upcoming",
    halftime: "Half-time",
    finished: "Full time",
    postponed: "Postponed",
    cancelled: "Cancelled",
    abandoned: "Abandoned",
  }[match.status];
}
export function eventMinute(minute: number | null, added: number | null) {
  return minute === null
    ? "Time unknown"
    : `${minute}${added === null ? "" : `+${added}`}′`;
}
export function readable(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
export function coverageText(coverage: Coverage, subject: string) {
  return {
    UNKNOWN: `${subject} coverage is unknown.`,
    NOT_AVAILABLE: `${subject} is not available for this match.`,
    PARTIAL: `Partial ${subject.toLowerCase()} coverage.`,
    COMPLETE: `${subject} is complete up to the stored observation.`,
  }[coverage];
}
export function groupMatches(matches: CenterMatch[]) {
  const countries = new Map<
    string,
    {
      name: string;
      code: string | null;
      competitions: Map<
        string,
        { competition: CenterCompetition; matches: CenterMatch[] }
      >;
    }
  >();
  for (const match of matches) {
    const country = match.competition.country;
    const key = country?.slug ?? "international";
    if (!countries.has(key))
      countries.set(key, {
        name: country?.name ?? "International",
        code: country?.code ?? null,
        competitions: new Map(),
      });
    const groups = countries.get(key)!.competitions;
    if (!groups.has(match.competition.id))
      groups.set(match.competition.id, {
        competition: match.competition,
        matches: [],
      });
    groups.get(match.competition.id)!.matches.push(match);
  }
  return [...countries.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, value]) => ({
      key,
      name: value.name,
      code: value.code,
      competitions: [...value.competitions.values()].sort((a, b) =>
        a.competition.name.localeCompare(b.competition.name),
      ),
    }));
}
