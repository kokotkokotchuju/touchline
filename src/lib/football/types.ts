export type MatchStatus =
  "scheduled" | "live" | "finished" | "postponed" | "cancelled";
export type CompetitionKind = "league" | "cup" | "international";

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  region: string;
  kind: CompetitionKind;
  color: string;
  countryCode: string | null;
}

export function displayCompetitionName(name: string) {
  return name.trim().toLowerCase() === "primera division" ? "LaLiga" : name;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  color: string;
  accent: string;
}

export interface FootballMatch {
  id: string;
  competitionId: string;
  season: string;
  round: string;
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
  detailHref?: string;
}

export interface FootballSnapshot {
  source: "demo" | "provider";
  referenceDate: string;
  generatedAt: string;
  competitions: Competition[];
  matches: FootballMatch[];
}
