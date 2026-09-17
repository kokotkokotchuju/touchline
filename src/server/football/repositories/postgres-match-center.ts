import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { routes } from "@/lib/routes";
import {
  dateBounds,
  readable,
  SAMPLE_REFERENCE_DATE,
  utcToday,
  type CenterCatalogue,
  type CenterCompetition,
  type CenterMatch,
  type CenterStatistic,
  type CenterTeam,
  type MatchCenterDetail,
  type MatchCenterPage,
  type MatchCenterQuery,
} from "@/lib/football/match-center";
import { displayCompetitionName } from "@/lib/football/types";
import type { MatchCenterRepository } from "./match-center-repository";
import { getServerEnv } from "@/server/env";

// Phase 4 explicitly reads labelled development records. Real-data activation
// requires a separately verified provider/synchronization phase.
const development = {
  references: { some: { provider: { isDevelopment: true } } },
} satisfies Prisma.MatchWhereInput;
async function activeDataWhere(
  db: PrismaClient,
): Promise<Prisma.MatchWhereInput> {
  const env = getServerEnv();
  if (env.DATABASE_URL && env.FOOTBALL_PROVIDER) {
    const configuredProvider = await db.dataProvider.findFirst({
      where: { key: env.FOOTBALL_PROVIDER, isDevelopment: false },
      select: { id: true },
    });
    if (
      configuredProvider &&
      (await db.externalReference.count({
        where: { providerId: configuredProvider.id, matchId: { not: null } },
      })) > 0
    )
      return {
        references: {
          some: {
            provider: { key: env.FOOTBALL_PROVIDER, isDevelopment: false },
          },
        },
      };
    return {
      references: { some: { provider: { isDevelopment: false } } },
    };
  }
  return development;
}
function isProviderDataWhere(where: Prisma.MatchWhereInput): boolean {
  return where !== development;
}
const competitionSelect = {
  id: true,
  slug: true,
  name: true,
  region: true,
  country: { select: { slug: true, code: true, name: true } },
} satisfies Prisma.CompetitionSelect;
export const teamSelect = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  logoUrl: true,
  references: {
    select: { externalId: true, provider: { select: { key: true } } },
    take: 10,
  },
} satisfies Prisma.TeamSelect;
export const matchInclude = {
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
  season: { include: { competition: { select: competitionSelect } } },
  venue: { select: { name: true } },
  scores: true,
} satisfies Prisma.MatchInclude;
type MatchRow = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;
type TeamRow = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;
export function mapCenterTeam(row: TeamRow): CenterTeam {
  const palette = ["#176449", "#233f67", "#843747", "#624788"];
  const color =
    palette[
      parseInt(row.id.replaceAll("-", "").slice(-4), 16) % palette.length
    ];
  const providerReference = row.references.find(
    (reference) => reference.provider.key === "football-data-org",
  );
  return {
    ...row,
    logoUrl:
      row.logoUrl ??
      (providerReference
        ? `https://crests.football-data.org/${providerReference.externalId}.png`
        : null),
    color,
    accent: "#ffffff",
  };
}
export function mapCenterMatch(row: MatchRow): CenterMatch {
  const shootout = row.scores.find(
    (score) => score.period === "PENALTY_SHOOTOUT",
  );
  return {
    id: row.id,
    publicId: String(row.publicId),
    href: routes.match(
      row.homeTeam.slug,
      row.awayTeam.slug,
      String(row.publicId),
    ),
    home: mapCenterTeam(row.homeTeam),
    away: mapCenterTeam(row.awayTeam),
    competition: {
      ...row.season.competition,
      name: displayCompetitionName(row.season.competition.name),
    },
    season: row.season.name,
    round: row.round,
    kickoff: row.kickoffAt?.toISOString() ?? null,
    status: row.status.toLowerCase() as CenterMatch["status"],
    minute: row.minute,
    addedMinute: row.addedMinute,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    shootout: shootout
      ? { home: shootout.homeScore, away: shootout.awayScore }
      : null,
    venue: row.venue?.name ?? row.venueName,
    observedAt: row.observedAt?.toISOString() ?? null,
  };
}
export function matchWhere(
  query: MatchCenterQuery,
  dataWhere: Prisma.MatchWhereInput = development,
): Prisma.MatchWhereInput {
  return {
    ...dataWhere,
    ...(query.status === "live"
      ? { status: { in: ["LIVE", "HALFTIME"] } }
      : query.status === "upcoming"
        ? { status: "SCHEDULED" }
        : query.status === "finished"
          ? { status: "FINISHED" }
          : {}),
    season: {
      competition: {
        ...(query.competition ? { slug: query.competition } : {}),
        ...(query.country
          ? query.country === "international"
            ? { countryId: null }
            : { country: { slug: query.country } }
          : {}),
      },
    },
  };
}
export class PostgresMatchCenterRepository implements MatchCenterRepository {
  constructor(private readonly db: PrismaClient) {}
  async catalogue(): Promise<CenterCatalogue> {
    const dataWhere = await activeDataWhere(this.db);
    const competitions: CenterCompetition[] =
      await this.db.competition.findMany({
        where: { seasons: { some: { matches: { some: dataWhere } } } },
        select: competitionSelect,
        orderBy: { name: "asc" },
        take: 1000,
      });
    const countries = [
      ...new Map(
        competitions.flatMap((competition) =>
          competition.country
            ? [[competition.country.slug, competition.country] as const]
            : [],
        ),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
    if (competitions.some((competition) => !competition.country))
      countries.push({
        slug: "international",
        name: "International",
        code: "INT",
      });
    return { competitions, countries };
  }
  async list(query: MatchCenterQuery): Promise<MatchCenterPage> {
    const dataWhere = await activeDataWhere(this.db);
    const date = query.date ?? utcToday();
    const { start, end } = dateBounds(date, query.timeZone);
    const base = matchWhere(query, dataWhere);
    const where = {
      ...base,
      kickoffAt: { gte: start, lt: end },
    } satisfies Prisma.MatchWhereInput;
    const { rows, count, undated } = await this.db.$transaction(
      async (tx) => {
        const rows = await tx.match.findMany({
          where,
          include: matchInclude,
          orderBy: [{ kickoffAt: "asc" }, { id: "asc" }],
          take: 101,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        });
        const count = await tx.match.count({ where });
        const undated = await tx.match.findMany({
          where: { ...base, kickoffAt: null },
          include: matchInclude,
          orderBy: { id: "asc" },
          take: 7,
        });
        return { rows, count, undated };
      },
      { isolationLevel: "RepeatableRead", timeout: 15000 },
    );
    return {
      data: rows.slice(0, 100).map(mapCenterMatch),
      undated: undated.slice(0, 6).map(mapCenterMatch),
      meta: {
        source: isProviderDataWhere(dataWhere) ? "provider" : "development",
        date,
        dayTimeZone: "UTC",
        timeZone: query.timeZone,
        count,
        nextCursor: rows.length > 100 ? rows[99].id : null,
        hasMoreUndated: undated.length > 6,
        sampleReferenceDate: isProviderDataWhere(dataWhere)
          ? utcToday()
          : SAMPLE_REFERENCE_DATE,
        readAt: new Date().toISOString(),
      },
    };
  }
  async detail(publicId: string): Promise<MatchCenterDetail | null> {
    const dataWhere = await activeDataWhere(this.db);
    if (
      !/^[1-9][0-9]{0,18}$/.test(publicId) ||
      BigInt(publicId) > BigInt("9223372036854775807")
    )
      return null;
    const row = await this.db.match.findFirst({
      where: { ...dataWhere, publicId: BigInt(publicId) },
      include: {
        ...matchInclude,
        events: {
          orderBy: { sequence: "asc" },
          take: 2001,
          include: {
            player: { select: { name: true } },
            manager: { select: { name: true } },
            assistPlayer: { select: { name: true } },
            playerIn: { select: { name: true } },
            playerOut: { select: { name: true } },
          },
        },
        lineups: {
          orderBy: { teamId: "asc" },
          include: {
            manager: { select: { name: true } },
            players: {
              orderBy: [
                { role: "asc" },
                { shirtNumber: "asc" },
                { playerId: "asc" },
              ],
              include: { player: { select: { name: true } } },
            },
          },
        },
        statisticContexts: {
          where: { scope: "MATCH", period: "TOTAL", split: "OVERALL" },
          include: { teamStatistics: { include: { definition: true } } },
        },
        tie: {
          include: {
            firstTeam: { include: { team: { select: { name: true } } } },
            secondTeam: { include: { team: { select: { name: true } } } },
            winnerTeam: { include: { team: { select: { name: true } } } },
          },
        },
      },
    });
    if (!row) return null;
    const history = row.kickoffAt
      ? await this.db.match.findMany({
          where: {
            ...dataWhere,
            id: { not: row.id },
            status: "FINISHED",
            kickoffAt: {
              lt: new Date(Math.min(row.kickoffAt.getTime(), Date.now())),
            },
            OR: [
              { homeTeamId: row.homeTeamId, awayTeamId: row.awayTeamId },
              { homeTeamId: row.awayTeamId, awayTeamId: row.homeTeamId },
            ],
          },
          include: matchInclude,
          orderBy: [{ kickoffAt: "desc" }, { id: "desc" }],
          take: 6,
        })
      : [];
    const stats = new Map<string, CenterStatistic>();
    for (const context of row.statisticContexts)
      for (const stat of context.teamStatistics) {
        const definition = stat.definition;
        if (!stats.has(definition.key))
          stats.set(definition.key, {
            key: definition.key,
            name: readable(definition.name),
            unit: definition.unit,
            valueType: definition.valueType,
            home: null,
            away: null,
          });
        const metric = stats.get(definition.key)!;
        const value =
          stat.integerValue?.toString() ??
          stat.decimalValue?.toString() ??
          null;
        if (stat.teamId === row.homeTeamId) metric.home = value;
        if (stat.teamId === row.awayTeamId) metric.away = value;
      }
    return {
      match: mapCenterMatch(row),
      source: isProviderDataWhere(dataWhere) ? "provider" : "development",
      coverage: {
        events: row.eventsCoverage,
        lineups: row.lineupsCoverage,
        statistics: row.statisticsCoverage,
      },
      events: row.events.slice(0, 2000).map((event) => ({
        id: event.id,
        sequence: event.sequence,
        kind: event.kind,
        status: event.status,
        teamId: event.teamId,
        minute: event.minute,
        addedMinute: event.addedMinute,
        period: event.period,
        player: event.player?.name ?? null,
        manager: event.manager?.name ?? null,
        assist: event.assistPlayer?.name ?? null,
        playerIn: event.playerIn?.name ?? null,
        playerOut: event.playerOut?.name ?? null,
        detail: event.detail,
        relatedEventId: event.relatedEventId,
      })),
      eventsTruncated: row.events.length > 2000,
      lineups: row.lineups.map((lineup) => ({
        id: lineup.id,
        teamId: lineup.teamId,
        formation: lineup.formation,
        status: lineup.status,
        manager: lineup.manager?.name ?? null,
        players: lineup.players.map((player) => ({
          id: player.playerId,
          name: player.player.name,
          role: player.role,
          position: player.position,
          shirtNumber: player.shirtNumber,
          captain: player.captain,
          x: player.positionX === null ? null : Number(player.positionX),
          y: player.positionY === null ? null : Number(player.positionY),
        })),
      })),
      statistics: [...stats.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      scores: row.scores.map((score) => ({
        period: score.period,
        home: score.homeScore,
        away: score.awayScore,
      })),
      headToHead: history.map(mapCenterMatch),
      tie: row.tie
        ? {
            round: row.tie.roundName,
            leg: row.legNumber,
            first: row.tie.firstTeam?.team.name ?? null,
            second: row.tie.secondTeam?.team.name ?? null,
            firstScore: row.tie.firstAggregate,
            secondScore: row.tie.secondAggregate,
            winner: row.tie.winnerTeam?.team.name ?? null,
          }
        : null,
    };
  }
}
