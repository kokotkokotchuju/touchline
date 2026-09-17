import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/server/env";
import {
  defaultSeason,
  type CompetitionDirectory,
  type CompetitionLeader,
  type CompetitionPageData,
  type CompetitionQuery,
  type CompetitionSection,
  type CompetitionTable,
  type DirectoryQuery,
} from "@/lib/football/competition-center";
import { utcToday } from "@/lib/football/match-center";
import { displayCompetitionName } from "@/lib/football/types";
import type { CompetitionRepository } from "./competition-repository";
import {
  mapCenterMatch,
  mapCenterTeam,
  matchInclude,
  teamSelect,
} from "./postgres-match-center";

const development = {
  references: { some: { provider: { isDevelopment: true } } },
};
const provider = {
  references: { some: { provider: { isDevelopment: false } } },
};
const identitySelect = {
  id: true,
  slug: true,
  name: true,
  kind: true,
  logoUrl: true,
  region: true,
  country: { select: { slug: true, name: true, code: true } },
} satisfies Prisma.CompetitionSelect;
const matchPageSize = 30;

function dataWhere() {
  return getServerEnv().FOOTBALL_READ_MODE === "demo" ? development : provider;
}

/** Only one exact SEASON/TOTAL/OVERALL context participates in a leaderboard.
 * Canonical player/team rows are summed once. Unknown spells make a total unknown.
 * The database aggregates before limiting, so a transferred player's total is intact.
 */
async function leaders(
  db: Prisma.TransactionClient,
  contextId: string,
  metric: "goals" | "assists",
  isDevelopment: boolean,
): Promise<CompetitionLeader[]> {
  const rows = await db.$queryRaw<
    {
      id: string;
      name: string;
      teams: string;
      value: string | null;
      rank: string | null;
    }[]
  >(Prisma.sql`
    WITH totals AS (
      SELECT p.id, p.name, string_agg(DISTINCT t.name, ', ' ORDER BY t.name) AS teams,
        CASE WHEN count(s.integer_value) = count(*) THEN sum(s.integer_value) ELSE NULL END AS total
      FROM player_statistics s
      JOIN players p ON p.id = s.player_id
      JOIN teams t ON t.id = s.team_id
      JOIN statistic_definitions d ON d.id = s.definition_id
      WHERE s.context_id = ${contextId}::uuid AND d.key = ${metric}
        AND d.value_type = 'COUNT' AND d.aggregation = 'SUM'
        AND EXISTS (SELECT 1 FROM external_references e JOIN providers v ON v.id = e.provider_id
          WHERE e.player_statistic_id = s.id AND v.is_development = ${isDevelopment})
      GROUP BY p.id, p.name
    ), ranked AS (
      SELECT *, CASE WHEN total IS NOT NULL THEN rank() OVER (ORDER BY total DESC NULLS LAST) END AS position
      FROM totals
    )
    SELECT id::text, name, teams, total::text AS value, position::text AS rank FROM ranked
    ORDER BY total DESC NULLS LAST, name, id LIMIT 20
  `);
  return rows.map((row) => ({
    ...row,
    rank: row.rank === null ? null : Number(row.rank),
  }));
}

export class PostgresCompetitionRepository implements CompetitionRepository {
  constructor(private readonly db: PrismaClient) {}

  async directory(query: DirectoryQuery): Promise<CompetitionDirectory> {
    const sourceWhere = dataWhere();
    const where: Prisma.CompetitionWhereInput = {
      ...sourceWhere,
      ...(query.kind !== "all"
        ? {
            kind: query.kind.toUpperCase() as
              "LEAGUE" | "CUP" | "INTERNATIONAL",
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { country: { name: { contains: query.q, mode: "insensitive" } } },
              { region: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (tx) => {
        const data = await tx.competition.findMany({
          where,
          select: {
            ...identitySelect,
            _count: { select: { seasons: { where: sourceWhere } } },
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * 24,
          take: 24,
        });
        const count = await tx.competition.count({ where });
        return {
          data: data.map(({ _count, ...row }) => ({
            ...row,
            name: displayCompetitionName(row.name),
            seasons: _count.seasons,
          })),
          count,
          page: query.page,
          pageSize: 24,
          source: getServerEnv().FOOTBALL_READ_MODE === "demo"
            ? "development"
            : "provider",
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 15000 },
    );
  }

  async page(
    slug: string,
    seasonSlug: string | undefined,
    section: CompetitionSection,
    query: CompetitionQuery,
  ): Promise<CompetitionPageData | null> {
    const sourceWhere = dataWhere();
    return this.db.$transaction(
      async (tx) => {
        const row = await tx.competition.findFirst({
          where: { slug, ...sourceWhere },
          select: {
            ...identitySelect,
            seasons: {
              where: sourceWhere,
              orderBy: [{ startsOn: "desc" }, { id: "asc" }],
              select: {
                id: true,
                slug: true,
                name: true,
                startsOn: true,
                endsOn: true,
              },
            },
          },
        });
        if (!row) return null;
        const { seasons: records, ...competition } = row;
        const seasons = records.map((season) => ({
          ...season,
          startsOn: season.startsOn.toISOString().slice(0, 10),
          endsOn: season.endsOn.toISOString().slice(0, 10),
        }));
        const season = seasonSlug
          ? (seasons.find((season) => season.slug === seasonSlug) ?? null)
          : defaultSeason(seasons, utcToday());
        if (seasonSlug && !season) return null;
        const result: CompetitionPageData = {
          competition: {
            ...competition,
            name: displayCompetitionName(competition.name),
          },
          seasons,
          season,
          section,
          query,
          stages: [],
          scopeLabel: "Whole season",
          teamCount: 0,
          counts: { all: 0, fixtures: 0, results: 0, live: 0 },
          tables: [],
          tablesTruncated: false,
          ties: [],
          tiesTruncated: false,
          matches: [],
          matchCount: 0,
          matchPageSize,
          upcoming: [],
          recent: [],
          statistics: { scorers: [], assists: [], teams: [], truncated: false },
          source: getServerEnv().FOOTBALL_READ_MODE === "demo"
            ? "development"
            : "provider",
        };
        if (!season) return query.stage ? null : result;
        const stages = await tx.competitionStage.findMany({
          where: { seasonId: season.id },
          select: {
            id: true,
            slug: true,
            name: true,
            kind: true,
            groups: {
              select: { id: true, slug: true, name: true },
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            },
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
        result.stages = stages;
        const stage = query.stage
          ? stages.find((stage) => stage.slug === query.stage)
          : undefined;
        const group = query.group
          ? stage?.groups.find((group) => group.slug === query.group)
          : undefined;
        if ((query.stage && !stage) || (query.group && !group)) return null;
        result.scopeLabel = group
          ? `${stage!.name} · ${group.name}`
          : (stage?.name ?? "Whole season");
        result.teamCount = await tx.seasonTeam.count({
          where: { seasonId: season.id },
        });
        const scope = {
          seasonId: season.id,
          ...(stage ? { stageId: stage.id } : {}),
          ...(group ? { groupId: group.id } : {}),
        };
        const matchScope: Prisma.MatchWhereInput = { ...scope, ...sourceWhere };
        const statusCounts = await tx.match.groupBy({
          by: ["status"],
          where: matchScope,
          _count: true,
        });
        for (const item of statusCounts) {
          result.counts.all += item._count;
          if (["SCHEDULED", "POSTPONED"].includes(item.status))
            result.counts.fixtures += item._count;
          if (item.status === "FINISHED") result.counts.results += item._count;
          if (["LIVE", "HALFTIME"].includes(item.status))
            result.counts.live += item._count;
        }
        if (section === "overview") {
          result.upcoming = (
            await tx.match.findMany({
              where: {
                ...matchScope,
                status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
              },
              include: matchInclude,
              orderBy: [
                { kickoffAt: { sort: "asc", nulls: "last" } },
                { id: "asc" },
              ],
              take: 4,
            })
          ).map(mapCenterMatch);
          result.recent = (
            await tx.match.findMany({
              where: { ...matchScope, status: "FINISHED" },
              include: matchInclude,
              orderBy: [
                { kickoffAt: { sort: "desc", nulls: "last" } },
                { id: "desc" },
              ],
              take: 4,
            })
          ).map(mapCenterMatch);
        }
        if (section === "matches") {
          const where: Prisma.MatchWhereInput = {
            ...matchScope,
            ...(query.view === "fixtures"
              ? { status: { in: ["SCHEDULED", "POSTPONED"] } }
              : query.view === "results"
                ? { status: "FINISHED" }
                : {}),
          };
          const order = query.view === "results" ? "desc" : "asc";
          result.matches = (
            await tx.match.findMany({
              where,
              include: matchInclude,
              orderBy: [
                { kickoffAt: { sort: order, nulls: "last" } },
                { id: order },
              ],
              take: matchPageSize,
              skip: (query.page - 1) * matchPageSize,
            })
          ).map(mapCenterMatch);
          result.matchCount = result.counts[query.view];
        }
        if (section === "overview" || section === "standings") {
          const rows = await tx.standing.findMany({
            where: { ...scope, ...sourceWhere, variant: "OVERALL" },
            include: {
              participation: { include: { team: { select: teamSelect } } },
            },
            orderBy: [
              { position: { sort: "asc", nulls: "last" } },
              { teamId: "asc" },
            ],
            take: 1001,
          });
          result.tablesTruncated = rows.length > 1000;
          const tables = new Map<string, CompetitionTable>();
          // Include empty stages/groups so absent coverage is visible.
          for (const candidate of stages.filter(
            (candidate) => !stage || candidate.id === stage.id,
          )) {
            if (candidate.kind === "KNOCKOUT") continue;
            if (candidate.kind === "GROUP") {
              for (const item of candidate.groups.filter(
                (item) => !group || item.id === group.id,
              ))
                tables.set(item.id, {
                  id: item.id,
                  name: `${candidate.name} · ${item.name}`,
                  rows: [],
                });
            } else
              tables.set(candidate.id, {
                id: candidate.id,
                name: candidate.name,
                rows: [],
              });
          }
          for (const item of rows.slice(0, 1000)) {
            const key = item.groupId ?? item.stageId ?? season.id;
            if (!tables.has(key))
              tables.set(key, {
                id: key,
                name:
                  stages.find((stage) => stage.id === item.stageId)?.name ??
                  "Season table",
                rows: [],
              });
            tables.get(key)!.rows.push({
              id: item.id,
              team: mapCenterTeam(item.participation.team),
              position: item.position,
              played: item.played,
              won: item.won,
              drawn: item.drawn,
              lost: item.lost,
              goalsFor: item.goalsFor,
              goalsAgainst: item.goalsAgainst,
              goalDifference: item.goalDifference,
              points: item.points?.toString() ?? null,
              pointsAdjustment: item.pointsAdjustment?.toString() ?? null,
              form: item.form,
              formCoverage: item.formCoverage,
              observedAt: item.observedAt?.toISOString() ?? null,
            });
          }
          result.tables = [...tables.values()];
          const ties = group
            ? []
            : await tx.knockoutTie.findMany({
                where: { ...scope, ...sourceWhere },
                include: {
                  stage: { select: { name: true } },
                  firstTeam: { include: { team: { select: teamSelect } } },
                  secondTeam: { include: { team: { select: teamSelect } } },
                  nextTie: {
                    select: { id: true, roundName: true, slot: true },
                  },
                  matches: {
                    where: sourceWhere,
                    include: matchInclude,
                    orderBy: [{ legNumber: "asc" }, { id: "asc" }],
                    take: 11,
                  },
                },
                orderBy: [
                  { stage: { sortOrder: "asc" } },
                  { roundNumber: "asc" },
                  { slot: "asc" },
                  { id: "asc" },
                ],
                take: 257,
              });
          result.tiesTruncated = ties.length > 256;
          result.ties = ties.slice(0, 256).map((tie) => ({
            id: tie.id,
            stageId: tie.stageId,
            stage: tie.stage.name,
            round: tie.roundName,
            roundNumber: tie.roundNumber,
            slot: tie.slot,
            first: tie.firstTeam ? mapCenterTeam(tie.firstTeam.team) : null,
            second: tie.secondTeam ? mapCenterTeam(tie.secondTeam.team) : null,
            winnerId: tie.winnerTeamId,
            firstAggregate: tie.firstAggregate,
            secondAggregate: tie.secondAggregate,
            next: tie.nextTie
              ? {
                  id: tie.nextTie.id,
                  round: tie.nextTie.roundName,
                  slot: tie.nextTie.slot,
                  teamSlot: tie.nextSlot!,
                }
              : null,
            matches: tie.matches.slice(0, 10).map((match) => ({
              ...mapCenterMatch(match),
              leg: match.legNumber,
            })),
            matchesTruncated: tie.matches.length > 10,
          }));
        }
        if (section === "overview" || section === "stats") {
          const context = await tx.statisticContext.findFirst({
            where: {
              seasonId: season.id,
              scope: "SEASON",
              period: "TOTAL",
              split: "OVERALL",
              stageId: stage?.id ?? null,
              groupId: group?.id ?? null,
            },
          });
          if (context) {
            const isDevelopment =
              getServerEnv().FOOTBALL_READ_MODE === "demo";
            result.statistics.scorers = await leaders(
              tx,
              context.id,
              "goals",
              isDevelopment,
            );
            result.statistics.assists = await leaders(
              tx,
              context.id,
              "assists",
              isDevelopment,
            );
            const metrics = await tx.teamStatistic.findMany({
              where: { contextId: context.id, ...sourceWhere },
              include: {
                definition: true,
                participation: { include: { team: { select: teamSelect } } },
              },
              orderBy: [{ definition: { name: "asc" } }, { teamId: "asc" }],
              take: 201,
            });
            result.statistics.truncated = metrics.length > 200;
            result.statistics.teams = metrics.slice(0, 200).map((item) => ({
              team: mapCenterTeam(item.participation.team),
              key: item.definition.key,
              name: item.definition.name,
              unit: item.definition.unit,
              value:
                item.integerValue?.toString() ??
                item.decimalValue?.toString() ??
                null,
              observedAt: item.observedAt?.toISOString() ?? null,
            }));
          }
        }
        return result;
      },
      { isolationLevel: "RepeatableRead", timeout: 20000 },
    );
  }
}
