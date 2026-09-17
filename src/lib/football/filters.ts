import type { FootballMatch, MatchStatus } from "./types";

export const TIME_ZONES = [
  "UTC",
  "Europe/Bratislava",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
] as const;

export function dateInTimeZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatKickoff(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export interface MatchFilters {
  date: string;
  timeZone: string;
  status: "all" | MatchStatus;
  competitionId: string;
  query: string;
  savedOnly: boolean;
  savedIds: readonly string[];
}

export function filterMatches(
  matches: readonly FootballMatch[],
  filters: MatchFilters,
): FootballMatch[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return matches
    .filter(
      (match) =>
        dateInTimeZone(match.kickoff, filters.timeZone) === filters.date &&
        (filters.status === "all" || match.status === filters.status) &&
        (!filters.competitionId ||
          match.competitionId === filters.competitionId) &&
        (!filters.savedOnly || filters.savedIds.includes(match.id)) &&
        (!query ||
          `${match.home.name} ${match.away.name} ${match.venue}`
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort(
      (a, b) => a.kickoff.localeCompare(b.kickoff) || a.id.localeCompare(b.id),
    );
}
