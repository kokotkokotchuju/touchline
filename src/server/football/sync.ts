import "server-only";

import { getServerEnv } from "@/server/env";
import { getDb } from "@/server/db";
import { logRequest } from "@/server/production";
import { ApiFootballProvider } from "./providers/api-football";
import { FootballDataOrgProvider } from "./providers/football-data-org";
import { SportmonksProvider } from "./providers/sportmonks";

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

export async function synchronizeFootball() {
  const env = getServerEnv();
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for provider synchronization");
  const provider = env.FOOTBALL_PROVIDER === "football-data-org"
    ? new FootballDataOrgProvider()
    : env.FOOTBALL_PROVIDER === "sportmonks"
      ? new SportmonksProvider()
      : new ApiFootballProvider();
  const db = getDb();
  const providerRecord = await db.dataProvider.upsert({
    where: { key: provider.key },
    update: { name: provider.key === "football-data-org" ? "football-data.org" : provider.key === "sportmonks" ? "SportMonks" : "API-Football", isDevelopment: false },
    create: { key: provider.key, name: provider.key === "football-data-org" ? "football-data.org" : provider.key === "sportmonks" ? "SportMonks" : "API-Football", isDevelopment: false },
  });
  const configuredLeagues = new Set(
    (env.FOOTBALL_PROVIDER === "football-data-org"
      ? env.FOOTBALL_DATA_COMPETITIONS ?? ""
      : env.FOOTBALL_PROVIDER === "sportmonks"
        ? env.SPORTMONKS_LEAGUES ?? ""
        : env.API_FOOTBALL_LEAGUES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const competitions = (await provider.getCompetitions()).data.filter(
    (item) =>
      configuredLeagues.size === 0 || configuredLeagues.has(item.externalId),
  );
  let seasonsCount = 0;
  let teamsCount = 0;
  let matchesCount = 0;
  let standingsCount = 0;
  const configuredSeasons = new Set(
    (env.FOOTBALL_PROVIDER === "sportmonks"
      ? env.SPORTMONKS_SEASONS ?? "2022,2023,2024"
      : env.API_FOOTBALL_SEASONS ?? "2022,2023,2024")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  for (const competition of competitions) {
    const countryCode = competition.countryCode;
    const country = countryCode
      ? await (async () => {
          const countrySlug = slug(competition.region);
          const existing = await db.country.findFirst({
            where: {
              OR: [
                { code: countryCode },
                { slug: countrySlug },
              ],
            },
          });
          return existing
            ? db.country.update({
                where: { id: existing.id },
                  data: { code: countryCode, name: competition.region },
              })
            : db.country.create({
                data: {
                    code: countryCode,
                  slug: countrySlug,
                  name: competition.region,
                },
              });
        })()
      : null;
    const competitionRecord = await db.competition.upsert({
      where: { slug: slug(competition.name) },
      update: {
        name: competition.name,
        kind: competition.kind.toUpperCase() as
          "LEAGUE" | "CUP" | "INTERNATIONAL",
        region: competition.region,
        countryId: country?.id,
      },
      create: {
        slug: slug(competition.name),
        name: competition.name,
        kind: competition.kind.toUpperCase() as
          "LEAGUE" | "CUP" | "INTERNATIONAL",
        region: competition.region,
        countryId: country?.id,
      },
    });
    await db.externalReference.upsert({
      where: {
        providerId_competitionId: {
          providerId: providerRecord.id,
          competitionId: competitionRecord.id,
        },
      },
      update: { externalId: competition.externalId },
      create: {
        providerId: providerRecord.id,
        externalId: competition.externalId,
        competitionId: competitionRecord.id,
      },
    });

    const seasons = (await provider.getSeasons(competition.externalId)).data;
    const selectedSeasons = provider.key === "football-data-org"
      ? seasons
      : seasons
          .filter((season) =>
            [...configuredSeasons].some(
              (allowed) =>
                season.name === allowed ||
                season.name.startsWith(`${allowed}/`),
            ),
          )
          .slice(-2);
    for (const season of selectedSeasons) {
      const seasonRecord = await db.season.upsert({
        where: {
          competitionId_slug: {
            competitionId: competitionRecord.id,
            slug: slug(season.name),
          },
        },
        update: {
          name: season.name,
          startsOn: new Date(season.startsOn),
          endsOn: new Date(season.endsOn),
        },
        create: {
          competitionId: competitionRecord.id,
          slug: slug(season.name),
          name: season.name,
          startsOn: new Date(season.startsOn),
          endsOn: new Date(season.endsOn),
        },
      });
      await db.externalReference.upsert({
        where: {
          providerId_seasonId: {
            providerId: providerRecord.id,
            seasonId: seasonRecord.id,
          },
        },
        update: { externalId: season.externalId },
        create: {
          providerId: providerRecord.id,
          externalId: season.externalId,
          seasonId: seasonRecord.id,
        },
      });
      const stageRecord = await db.competitionStage.upsert({
        where: {
          seasonId_slug: {
            seasonId: seasonRecord.id,
            slug: "league",
          },
        },
        update: { name: "League", kind: "LEAGUE", sortOrder: 1 },
        create: {
          seasonId: seasonRecord.id,
          slug: "league",
          name: "League",
          kind: "LEAGUE",
          sortOrder: 1,
        },
      });
      seasonsCount++;

      const matches = (
        await provider.getMatches({
          from: season.startsOn,
          to: season.endsOn,
          competitionId: competition.externalId,
          seasonId: season.externalId,
        })
      ).data;
      for (const match of matches) {
        const home = await upsertTeam(
          db,
          providerRecord.id,
          match.homeTeamExternalId,
          match.homeTeamName ?? `Team ${match.homeTeamExternalId}`,
          match.homeTeamLogoUrl ?? null,
        );
        const away = await upsertTeam(
          db,
          providerRecord.id,
          match.awayTeamExternalId,
          match.awayTeamName ?? `Team ${match.awayTeamExternalId}`,
          match.awayTeamLogoUrl ?? null,
        );
        teamsCount += 2;
        await db.seasonTeam.upsert({
          where: {
            seasonId_teamId: { seasonId: seasonRecord.id, teamId: home.id },
          },
          update: {},
          create: { seasonId: seasonRecord.id, teamId: home.id },
        });
        await db.seasonTeam.upsert({
          where: {
            seasonId_teamId: { seasonId: seasonRecord.id, teamId: away.id },
          },
          update: {},
          create: { seasonId: seasonRecord.id, teamId: away.id },
        });
        const existing = await db.externalReference.findFirst({
          where: {
            providerId: providerRecord.id,
            externalId: match.externalId,
          },
        });
        const data = {
          seasonId: seasonRecord.id,
          homeTeamId: home.id,
          awayTeamId: away.id,
          kickoffAt: match.kickoffAt ? new Date(match.kickoffAt) : null,
          status: match.status.toUpperCase() as
            "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED",
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          minute: match.minute,
          round: match.round,
          venueName: match.venueName,
          observedAt: new Date(match.observedAt),
        };
        const matchRecord = existing?.matchId
          ? await db.match.update({ where: { id: existing.matchId }, data })
          : await db.match.create({ data });
        if (!existing) {
          await db.externalReference.create({
            data: {
              providerId: providerRecord.id,
              externalId: match.externalId,
              matchId: matchRecord.id,
            },
          });
        }

        matchesCount++;
      }
      const standings = (
        await provider.getStandings(competition.externalId, season.externalId)
      ).data;
      for (const standing of standings) {
        const teamRef = await db.externalReference.findFirst({
          where: {
            providerId: providerRecord.id,
            externalId: standing.teamExternalId,
            teamId: { not: null },
          },
        });
        if (!teamRef?.teamId) continue;
        const existingStanding = await db.standing.findFirst({
          where: {
            seasonId: seasonRecord.id,
            stageId: stageRecord.id,
            teamId: teamRef.teamId,
            variant: "OVERALL",
          },
        });
        const standingData = {
          seasonId: seasonRecord.id,
          stageId: stageRecord.id,
          teamId: teamRef.teamId,
          variant: "OVERALL" as const,
          position: standing.rank,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          goalDifference: standing.goalsFor - standing.goalsAgainst,
          points: standing.points,
          observedAt: new Date(),
        };
        const standingRecord = existingStanding
          ? await db.standing.update({
              where: { id: existingStanding.id },
              data: standingData,
            })
          : await db.standing.create({ data: standingData });
        await db.externalReference.upsert({
          where: {
            providerId_standingId: {
              providerId: providerRecord.id,
              standingId: standingRecord.id,
            },
          },
          update: { externalId: `${season.externalId}:${standing.teamExternalId}` },
          create: {
            providerId: providerRecord.id,
            externalId: `${season.externalId}:${standing.teamExternalId}`,
            standingId: standingRecord.id,
          },
        });
        standingsCount++;
      }
    }
  }
  logRequest("provider_sync_completed", {
    provider: provider.key,
    competitions: competitions.length,
    seasons: seasonsCount,
    teams: teamsCount,
    matches: matchesCount,
    standings: standingsCount,
  });
  return {
    provider: provider.key,
    competitions: competitions.length,
    seasons: seasonsCount,
    teams: teamsCount,
    matches: matchesCount,
    standings: standingsCount,
  };
}

export const synchronizeApiFootball = synchronizeFootball;

export async function synchronizeSportmonksLineups() {
  const env = getServerEnv();
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for lineup synchronization");
  const provider = new SportmonksProvider();
  const db = getDb();
  const providerRecord = await db.dataProvider.findUnique({
    where: { key: provider.key },
  });
  if (!providerRecord) throw new Error("Run the SportMonks catalog synchronization first.");

  const references = await db.externalReference.findMany({
    where: {
      providerId: providerRecord.id,
      matchId: { not: null },
      match: { lineupsCoverage: { not: "COMPLETE" } },
    },
    select: { externalId: true, matchId: true },
    orderBy: { match: { kickoffAt: "desc" } },
    take: env.SPORTMONKS_LINEUP_MATCH_LIMIT ?? 25,
  });
  let matches = 0;
  let lineups = 0;
  let players = 0;
  for (const reference of references) {
    if (!reference.matchId) continue;
    const match = await db.match.findUnique({
      where: { id: reference.matchId },
      select: { id: true },
    });
    if (!match) continue;
    const result = await provider.getLineups(reference.externalId);
    if (!result.data.length) continue;
    for (const lineup of result.data) {
      const teamReference = await db.externalReference.findFirst({
        where: {
          providerId: providerRecord.id,
          externalId: lineup.teamExternalId,
          teamId: { not: null },
        },
        select: { teamId: true },
      });
      if (!teamReference?.teamId) continue;
      const existing = await db.lineup.findUnique({
        where: {
          matchId_teamId: { matchId: match.id, teamId: teamReference.teamId },
        },
        select: { id: true },
      });
      const lineupRecord = existing
        ? await db.lineup.update({
            where: { id: existing.id },
            data: {
              formation: lineup.formation,
              status: lineup.confirmed ? "CONFIRMED" : "PROVISIONAL",
              observedAt: new Date(result.fetchedAt),
            },
          })
        : await db.lineup.create({
            data: {
              matchId: match.id,
              teamId: teamReference.teamId,
              formation: lineup.formation,
              status: lineup.confirmed ? "CONFIRMED" : "PROVISIONAL",
              observedAt: new Date(result.fetchedAt),
            },
          });
      await db.externalReference.upsert({
        where: {
          providerId_lineupId: {
            providerId: providerRecord.id,
            lineupId: lineupRecord.id,
          },
        },
        update: { externalId: `${reference.externalId}:${lineup.teamExternalId}` },
        create: {
          providerId: providerRecord.id,
          externalId: `${reference.externalId}:${lineup.teamExternalId}`,
          lineupId: lineupRecord.id,
        },
      });
      await db.lineupPlayer.deleteMany({ where: { lineupId: lineupRecord.id } });
      for (const item of lineup.players) {
        const playerReference = await db.externalReference.findFirst({
          where: {
            providerId: providerRecord.id,
            externalId: item.playerExternalId,
            playerId: { not: null },
          },
          select: { playerId: true },
        });
        const player = playerReference?.playerId
          ? await db.player.update({
              where: { id: playerReference.playerId },
              data: item.playerName ? { name: item.playerName, displayName: item.playerName } : {},
            })
          : await db.player.create({
              data: {
                slug: `${slug(item.playerName ?? `player-${item.playerExternalId}`)}-${item.playerExternalId}`,
                name: item.playerName ?? `Player ${item.playerExternalId}`,
                displayName: item.playerName,
              },
            });
        if (!playerReference)
          await db.externalReference.create({
            data: {
              providerId: providerRecord.id,
              externalId: item.playerExternalId,
              playerId: player.id,
            },
          });
        await db.lineupPlayer.create({
          data: {
            lineupId: lineupRecord.id,
            playerId: player.id,
            role: item.starter ? "STARTER" : "SUBSTITUTE",
            shirtNumber: item.shirtNumber,
          },
        });
        players++;
      }
      lineups++;
    }
    await db.match.update({
      where: { id: match.id },
      data: { lineupsCoverage: "COMPLETE" },
    });
    matches++;
  }
  logRequest("sportmonks_lineups_sync_completed", { matches, lineups, players });
  return { provider: provider.key, matches, lineups, players };
}

export async function synchronizeLiveApiFootball() {
  const env = getServerEnv();
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for provider synchronization");
  const provider = env.FOOTBALL_PROVIDER === "football-data-org"
    ? new FootballDataOrgProvider()
  : env.FOOTBALL_PROVIDER === "sportmonks"
    ? new SportmonksProvider()
    : new ApiFootballProvider();
  const db = getDb();
  const providerRecord = await db.dataProvider.findUnique({
    where: { key: provider.key },
  });
  if (!providerRecord) {
    throw new Error(
      "Run the catalog synchronization before the live synchronization.",
    );
  }
  const liveMatches = (await provider.getLiveMatches()).data;
  let updated = 0;
  let skipped = 0;
  for (const match of liveMatches) {
    const reference = await db.externalReference.findFirst({
      where: {
        providerId: providerRecord.id,
        externalId: match.externalId,
        matchId: { not: null },
      },
    });
    if (!reference?.matchId) {
      skipped++;
      continue;
    }
    await db.match.update({
      where: { id: reference.matchId },
      data: {
        status:
          match.status === "live"
            ? "LIVE"
            : (match.status.toUpperCase() as "HALFTIME" | "FINISHED"),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        minute: match.minute,
        observedAt: new Date(match.observedAt),
      },
    });
    updated++;
  }
  logRequest("live_sync_completed", {
    provider: provider.key,
    received: liveMatches.length,
    updated,
    skipped,
  });
  return {
    provider: provider.key,
    received: liveMatches.length,
    updated,
    skipped,
  };
}

async function upsertTeam(
  db: ReturnType<typeof getDb>,
  providerId: string,
  externalId: string,
  name: string,
  logoUrl: string | null,
) {
  const existing = await db.externalReference.findFirst({
    where: { providerId, externalId, teamId: { not: null } },
  });
  const team = existing?.teamId
    ? await db.team.update({
        where: { id: existing.teamId },
        data: { name, shortName: name, logoUrl },
      })
    : await db.team.create({
        data: {
          slug: `${slug(name)}-${externalId}`,
          name,
          shortName: name,
          kind: "CLUB",
          logoUrl,
        },
      });
  if (!existing)
    await db.externalReference.create({
      data: { providerId, externalId, teamId: team.id },
    });
  return team;
}
