import { z } from "zod";
import { routes } from "@/lib/routes";
import type {
  CenterCompetition,
  CenterMatch,
  CenterTeam,
  Coverage,
} from "./match-center";

export const competitionSlug = z
  .string()
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const pageNumber = z
  .string()
  .regex(/^[1-9][0-9]{0,3}$/)
  .transform(Number)
  .default(1);
export const competitionQuerySchema = z
  .object({
    stage: competitionSlug.optional(),
    group: competitionSlug.optional(),
    view: z.enum(["all", "fixtures", "results"]).default("all"),
    page: pageNumber,
  })
  .strict()
  .refine((value) => !value.group || Boolean(value.stage), {
    message: "Select a stage before a group.",
  });
export const directoryQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    kind: z.enum(["all", "league", "cup", "international"]).default("all"),
    page: pageNumber,
  })
  .strict();
export type CompetitionQuery = z.infer<typeof competitionQuerySchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;
export type CompetitionSection = "overview" | "standings" | "matches" | "stats";
export type CompetitionIdentity = CenterCompetition & {
  kind: "LEAGUE" | "CUP" | "INTERNATIONAL";
  logoUrl: string | null;
};
export type CompetitionSeason = {
  id: string;
  slug: string;
  name: string;
  startsOn: string;
  endsOn: string;
};
export type CompetitionStage = {
  id: string;
  slug: string;
  name: string;
  kind: "LEAGUE" | "GROUP" | "KNOCKOUT";
  groups: { id: string; slug: string; name: string }[];
};
export type CompetitionDirectory = {
  data: (CompetitionIdentity & { seasons: number })[];
  count: number;
  page: number;
  pageSize: number;
  source: "development" | "provider";
};
export type CompetitionStanding = {
  id: string;
  team: CenterTeam;
  position: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: string | null;
  pointsAdjustment: string | null;
  form: ("W" | "D" | "L")[];
  formCoverage: Coverage;
  observedAt: string | null;
};
export type CompetitionTable = {
  id: string;
  name: string;
  rows: CompetitionStanding[];
};
export type CompetitionTie = {
  id: string;
  stageId: string;
  stage: string;
  round: string;
  roundNumber: number;
  slot: number;
  first: CenterTeam | null;
  second: CenterTeam | null;
  winnerId: string | null;
  firstAggregate: number | null;
  secondAggregate: number | null;
  next: { id: string; round: string; slot: number; teamSlot: string } | null;
  matches: (CenterMatch & { leg: number | null })[];
  matchesTruncated: boolean;
};
export type CompetitionLeader = {
  id: string;
  name: string;
  teams: string;
  value: string | null;
  rank: number | null;
};
export type CompetitionMetric = {
  team: CenterTeam;
  key: string;
  name: string;
  unit: string;
  value: string | null;
  observedAt: string | null;
};
export type CompetitionPageData = {
  competition: CompetitionIdentity;
  seasons: CompetitionSeason[];
  season: CompetitionSeason | null;
  stages: CompetitionStage[];
  section: CompetitionSection;
  query: CompetitionQuery;
  scopeLabel: string;
  teamCount: number;
  counts: { all: number; fixtures: number; results: number; live: number };
  tables: CompetitionTable[];
  tablesTruncated: boolean;
  ties: CompetitionTie[];
  tiesTruncated: boolean;
  matches: CenterMatch[];
  matchCount: number;
  matchPageSize: number;
  upcoming: CenterMatch[];
  recent: CenterMatch[];
  statistics: {
    scorers: CompetitionLeader[];
    assists: CompetitionLeader[];
    teams: CompetitionMetric[];
    truncated: boolean;
  };
  source: "development" | "provider";
};

export function parseCompetitionPath(
  parts: string[] = [],
): { season?: string; section: CompetitionSection } | null {
  const path = [...parts];
  let season: string | undefined;
  if (path[0] === "season") {
    if (!competitionSlug.safeParse(path[1]).success) return null;
    season = path[1];
    path.splice(0, 2);
  }
  if (
    path.length > 1 ||
    (path.length === 1 && !["standings", "matches", "stats"].includes(path[0]))
  )
    return null;
  return { season, section: (path[0] ?? "overview") as CompetitionSection };
}
export function competitionHref(
  slug: string,
  section: CompetitionSection = "overview",
  season?: string,
  query: Partial<CompetitionQuery> = {},
) {
  const suffix = section === "overview" ? undefined : section;
  const base = season
    ? routes.competitionSeason(slug, season, suffix)
    : routes.competition(slug, suffix);
  const params = new URLSearchParams();
  if (query.stage) params.set("stage", query.stage);
  if (query.group) params.set("group", query.group);
  if (section === "matches") {
    if (query.view && query.view !== "all") params.set("view", query.view);
    if (query.page && query.page > 1) params.set("page", String(query.page));
  }
  return base + (params.size ? `?${params}` : "");
}
export function directoryHref(query: Partial<DirectoryQuery> = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.kind && query.kind !== "all") params.set("kind", query.kind);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return `/competitions${params.size ? `?${params}` : ""}`;
}
/** Active or most recently started season; earliest future season if none has started. */
export function defaultSeason<T extends { startsOn: string; endsOn: string }>(
  seasons: T[],
  today: string,
): T | null {
  const descending = [...seasons].sort((a, b) =>
    b.startsOn.localeCompare(a.startsOn),
  );
  return (
    descending.find(
      (season) => season.startsOn <= today && season.endsOn >= today,
    ) ??
    descending.find((season) => season.startsOn <= today) ??
    descending.at(-1) ??
    null
  );
}
