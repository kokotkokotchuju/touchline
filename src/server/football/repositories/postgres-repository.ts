import "server-only";
import {
  displayCompetitionName,
  type Competition,
  type FootballMatch,
  type Team,
} from "@/lib/football/types";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import type { FootballReadRepository } from "./repository";
import { routes } from "@/lib/routes";
import { utcToday } from "@/lib/football/match-center";

function colorFor(value: string): string {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 55% 42%)`;
}

function team(record: {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  references: { externalId: string; provider: { key: string } }[];
}): Team {
  const providerReference = record.references.find(
    (reference) => reference.provider.key === "football-data-org",
  );
  return {
    id: record.id,
    name: record.name,
    shortName: record.shortName,
    logoUrl:
      record.logoUrl ??
      (providerReference
        ? `https://crests.football-data.org/${providerReference.externalId}.png`
        : null),
    color: colorFor(record.id),
    accent: "#ffffff",
  };
}

export class PostgresFootballRepository implements FootballReadRepository {
  async getSnapshot() {
    const db = getDb();
    const configuredProvider = await db.dataProvider.findFirst({
      where: { key: getServerEnv().FOOTBALL_PROVIDER ?? "football-data-org", isDevelopment: false },
      select: { id: true },
    });
    const provider =
      configuredProvider &&
      (await db.externalReference.count({
        where: { providerId: configuredProvider.id, matchId: { not: null } },
      })) > 0
        ? configuredProvider
        : await db.dataProvider.findFirst({
            where: {
              isDevelopment: false,
              references: { some: { matchId: { not: null } } },
            },
            select: { id: true },
            orderBy: { key: "asc" },
          });
    if (!provider) {
      return {
        source: "provider" as const,
        referenceDate: new Date().toISOString().slice(0, 10),
        generatedAt: new Date().toISOString(),
        competitions: [],
        matches: [],
      };
    }
    const competitionRecords = await db.competition.findMany({
      where: {
        references: { some: { providerId: provider.id } },
      },
      orderBy: { name: "asc" },
      include: { country: true },
    });
    const matchRecords = await db.match.findMany({
      where: {
        season: {
          competition: {
            references: { some: { providerId: provider.id } },
          },
        },
      },
      orderBy: [{ kickoffAt: "asc" }, { id: "asc" }],
      include: {
        season: { include: { competition: true } },
        homeTeam: {
          include: { references: { include: { provider: true } } },
        },
        awayTeam: {
          include: { references: { include: { provider: true } } },
        },
      },
    });

    const competitions: Competition[] = competitionRecords.map((record) => ({
      id: record.id,
      name: displayCompetitionName(record.name),
      shortName: displayCompetitionName(record.shortName ?? record.name),
      region: record.region,
      kind: record.kind.toLowerCase() as Competition["kind"],
      color: colorFor(record.id),
      countryCode: record.country?.code ?? null,
    }));
    const competitionIds = new Set(
      competitions.map((competition) => competition.id),
    );
    const matches: FootballMatch[] = matchRecords.flatMap((record) => {
      const competition = record.season?.competition;
      if (!competition || !competitionIds.has(competition.id)) return [];
      return [
        {
          id: record.id,
          competitionId: competition.id,
          season: record.season.name,
          round: record.round ?? "Regular season",
          kickoff:
            record.kickoffAt?.toISOString() ?? record.updatedAt.toISOString(),
          status: record.status.toLowerCase() as FootballMatch["status"],
          minute: record.minute,
          home: team(record.homeTeam),
          away: team(record.awayTeam),
          homeScore: record.homeScore,
          awayScore: record.awayScore,
          venue: record.venueName ?? "Venue unavailable",
          detailHref: routes.match(
            record.homeTeam.slug,
            record.awayTeam.slug,
            String(record.publicId),
          ),
        },
      ];
    });

    const generatedAt = new Date().toISOString();
    return {
      source: "provider" as const,
      referenceDate: utcToday(),
      generatedAt,
      competitions,
      matches,
    };
  }
}
