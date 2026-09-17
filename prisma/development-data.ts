import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";

/** Deterministic UUIDv8 sample identities; never used to identify provider records. */
export function sampleId(key: string) {
  const bytes = createHash("sha256")
    .update(`touchline:development:v1:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const SAMPLE_DATE = "2026-09-15";
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const observedAt = new Date(`${SAMPLE_DATE}T20:15:00Z`);
const id = sampleId;

export function requireDevelopmentDatabase(
  env: Readonly<Record<string, string | undefined>>,
): string {
  if (env.NODE_ENV === "production" || env.ALLOW_DEVELOPMENT_SEED !== "true") {
    throw new Error(
      "Development data requires ALLOW_DEVELOPMENT_SEED=true and a non-production NODE_ENV.",
    );
  }
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for development data.");
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  return env.DATABASE_URL;
}

/** Only upserts this version's synthetic identities; never truncates or deletes data. */
export async function seedDevelopmentData(client: PrismaClient) {
  return client.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(827164032)`;
      const references: Prisma.ExternalReferenceUncheckedCreateInput[] = [];
      const counts: Record<string, number> = {};
      async function save<T extends { id?: string }>(
        target: string,
        rows: T[],
        write: (row: T) => Promise<unknown>,
      ) {
        for (const row of rows) {
          if (!row.id) throw new Error("A development identity is missing.");
          await write(row);
          if (!["definition", "context"].includes(target))
            references.push({
              id: id(`reference:${target}:${row.id}`),
              providerId: id("provider"),
              externalId: row.id,
              [`${target}Id`]: row.id,
            });
        }
        counts[target] = (counts[target] ?? 0) + rows.length;
      }
      await tx.dataProvider.upsert({
        where: { id: id("provider") },
        create: {
          id: id("provider"),
          key: "development-seed",
          name: "Synthetic development data — not real results",
          isDevelopment: true,
        },
        update: {
          name: "Synthetic development data — not real results",
          isDevelopment: true,
        },
      });

      const countries: Prisma.CountryUncheckedCreateInput[] = [
        ["england", "GB-ENG", "England"],
        ["spain", "ES", "Spain"],
        ["germany", "DE", "Germany"],
        ["france", "FR", "France"],
      ].map(([slug, code, name]) => ({ id: id(slug), slug, code, name }));
      await save("country", countries, (row) =>
        tx.country.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const clubs = [
        "harbour",
        "riverside",
        "forest",
        "summit",
        "sol",
        "rhein",
      ];
      const teams = [...clubs, "sample-england", "sample-spain"];
      const labels = [
        "Sample Harbour FC",
        "Sample Riverside United",
        "Sample Forest Athletic",
        "Sample Summit City",
        "Sample Sol FC",
        "Sample Rhein SC",
        "Sample England XI",
        "Sample Spain XI",
      ];
      const countryKeys = [
        "england",
        "england",
        "england",
        "england",
        "spain",
        "germany",
        "england",
        "spain",
      ];
      const venues: Prisma.VenueUncheckedCreateInput[] = clubs.map(
        (key, index) => ({
          id: id(`venue:${key}`),
          name: `Sample ${key[0].toUpperCase() + key.slice(1)} Ground`,
          city: "Example city",
          countryId: id(countryKeys[index]),
          capacity: 18000 + index * 2000,
        }),
      );
      await save("venue", venues, (row) =>
        tx.venue.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const teamRows: Prisma.TeamUncheckedCreateInput[] = teams.map(
        (key, index) => ({
          id: id(key),
          slug: `demo-${key}`,
          name: labels[index],
          shortName: key.slice(0, 3).toUpperCase(),
          kind: index < 6 ? "CLUB" : "NATIONAL",
          countryId: id(countryKeys[index]),
          venueId: index < 6 ? id(`venue:${key}`) : null,
          foundedYear: index < 6 ? 1900 + index : null,
        }),
      );
      await save("team", teamRows, (row) =>
        tx.team.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const competitions: Prisma.CompetitionUncheckedCreateInput[] = [
        {
          id: id("league"),
          slug: "demo-premier-league",
          name: "Sample Premier League",
          kind: "LEAGUE",
          region: "Europe",
          countryId: id("england"),
        },
        {
          id: id("continental"),
          slug: "demo-continental-cup",
          name: "Sample Continental Cup",
          kind: "INTERNATIONAL",
          region: "Europe",
        },
        {
          id: id("cup"),
          slug: "demo-domestic-cup",
          name: "Sample Domestic Cup",
          kind: "CUP",
          region: "Europe",
          countryId: id("england"),
        },
        {
          id: id("nations"),
          slug: "demo-nations-cup",
          name: "Sample Nations Cup",
          kind: "INTERNATIONAL",
          region: "World",
        },
      ];
      await save("competition", competitions, (row) =>
        tx.competition.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const seasonKeys = [
        "league-current",
        "league-history",
        "continental-current",
        "cup-current",
        "nations-current",
      ];
      const seasonRows: Prisma.SeasonUncheckedCreateInput[] = seasonKeys.map(
        (key) => ({
          id: id(key),
          competitionId: id(key.split("-")[0]),
          slug: key.endsWith("history") ? "2025-26" : "2026-27",
          name: key.endsWith("history") ? "2025/26" : "2026/27",
          startsOn: date(key.endsWith("history") ? "2025-07-01" : "2026-07-01"),
          endsOn: date(key.endsWith("history") ? "2026-06-30" : "2027-06-30"),
        }),
      );
      await save("season", seasonRows, (row) =>
        tx.season.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      for (const season of seasonKeys) {
        const participants = season.startsWith("nations")
          ? teams.slice(6)
          : season.startsWith("continental")
            ? clubs
            : clubs.slice(0, 4);
        for (const team of participants)
          await tx.seasonTeam.upsert({
            where: {
              seasonId_teamId: { seasonId: id(season), teamId: id(team) },
            },
            create: { seasonId: id(season), teamId: id(team) },
            update: {},
          });
      }
      const stages: Prisma.CompetitionStageUncheckedCreateInput[] = [
        {
          id: id("league-stage"),
          seasonId: id("league-current"),
          slug: "regular-season",
          name: "Regular season",
          kind: "LEAGUE",
          sortOrder: 0,
        },
        {
          id: id("continental-groups"),
          seasonId: id("continental-current"),
          slug: "group-stage",
          name: "Group stage",
          kind: "GROUP",
          sortOrder: 0,
        },
        {
          id: id("continental-knockout"),
          seasonId: id("continental-current"),
          slug: "knockout",
          name: "Knockout stage",
          kind: "KNOCKOUT",
          sortOrder: 1,
        },
        {
          id: id("cup-knockout"),
          seasonId: id("cup-current"),
          slug: "knockout",
          name: "Cup rounds",
          kind: "KNOCKOUT",
          sortOrder: 0,
        },
        {
          id: id("nations-groups"),
          seasonId: id("nations-current"),
          slug: "group-stage",
          name: "Group stage",
          kind: "GROUP",
          sortOrder: 0,
        },
      ];
      await save("stage", stages, (row) =>
        tx.competitionStage.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const groups: Prisma.CompetitionGroupUncheckedCreateInput[] = [
        {
          id: id("continental-a"),
          seasonId: id("continental-current"),
          stageId: id("continental-groups"),
          slug: "a",
          name: "Group A",
          sortOrder: 0,
        },
        {
          id: id("continental-b"),
          seasonId: id("continental-current"),
          stageId: id("continental-groups"),
          slug: "b",
          name: "Group B",
          sortOrder: 1,
        },
        {
          id: id("nations-a"),
          seasonId: id("nations-current"),
          stageId: id("nations-groups"),
          slug: "a",
          name: "Group A",
          sortOrder: 0,
        },
      ];
      await save("group", groups, (row) =>
        tx.competitionGroup.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const players: Prisma.PlayerUncheckedCreateInput[] = [];
      const registrations: Prisma.TeamPlayerRegistrationUncheckedCreateInput[] =
        [];
      for (const [teamIndex, team] of teams.entries()) {
        for (let shirt = 1; shirt <= (teamIndex < 6 ? 13 : 2); shirt++) {
          const key = `${team}:player:${shirt}`;
          players.push({
            id: id(key),
            slug: `demo-${team}-player-${shirt}`,
            name: `Sample ${team} player ${shirt}`,
            countryId: id(countryKeys[teamIndex]),
            dateOfBirth:
              shirt === 13
                ? null
                : date(`2000-01-${String(shirt).padStart(2, "0")}`),
            position:
              shirt === 13
                ? null
                : shirt === 1
                  ? "GOALKEEPER"
                  : shirt <= 5
                    ? "DEFENDER"
                    : shirt <= 8
                      ? "MIDFIELDER"
                      : "FORWARD",
          });
          registrations.push({
            id: id(`registration:${key}`),
            playerId: id(key),
            teamId: id(team),
            startsOn: date("2026-07-01"),
            endsOn: null,
            shirtNumber: shirt,
            isLoan: team === "harbour" && shirt === 13,
          });
        }
      }
      registrations.push({
        id: id("historic-registration"),
        teamId: id("forest"),
        playerId: id("harbour:player:13"),
        startsOn: date("2025-07-01"),
        endsOn: date("2026-06-30"),
        shirtNumber: 20,
        isLoan: false,
      });
      await save("player", players, (row) =>
        tx.player.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      await save("registration", registrations, (row) =>
        tx.teamPlayerRegistration.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const managers: Prisma.ManagerUncheckedCreateInput[] = teams.map(
        (team, index) => ({
          id: id(`manager:${team}`),
          slug: `demo-coach-${team}`,
          name: `Sample ${team} coach`,
          countryId: id(countryKeys[index]),
        }),
      );
      await save("manager", managers, (row) =>
        tx.manager.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const assignments: Prisma.TeamManagerAssignmentUncheckedCreateInput[] =
        teams.map((team) => ({
          id: id(`assignment:${team}`),
          teamId: id(team),
          managerId: id(`manager:${team}`),
          role: "HEAD_COACH",
          startsOn: date("2026-07-01"),
        }));
      assignments.push({
        id: id("historic-assignment"),
        teamId: id("forest"),
        managerId: id("manager:harbour"),
        role: "INTERIM",
        startsOn: date("2025-11-01"),
        endsOn: date("2026-06-30"),
      });
      await save("assignment", assignments, (row) =>
        tx.teamManagerAssignment.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );

      const ties: Prisma.KnockoutTieUncheckedCreateInput[] = [
        {
          id: id("continental-final"),
          seasonId: id("continental-current"),
          stageId: id("continental-knockout"),
          roundNumber: 2,
          roundName: "Final",
          slot: 1,
          firstTeamId: id("harbour"),
          secondTeamId: id("sol"),
        },
        {
          id: id("continental-semi"),
          seasonId: id("continental-current"),
          stageId: id("continental-knockout"),
          roundNumber: 1,
          roundName: "Semi-final",
          slot: 1,
          firstTeamId: id("harbour"),
          secondTeamId: id("rhein"),
          winnerTeamId: id("harbour"),
          firstAggregate: 3,
          secondAggregate: 2,
          nextTieId: id("continental-final"),
          nextSlot: "FIRST",
        },
        {
          id: id("cup-final"),
          seasonId: id("cup-current"),
          stageId: id("cup-knockout"),
          roundNumber: 1,
          roundName: "Final",
          slot: 1,
          firstTeamId: id("harbour"),
          secondTeamId: id("riverside"),
          winnerTeamId: id("harbour"),
          firstAggregate: 1,
          secondAggregate: 1,
        },
      ];
      await save("tie", ties, (row) =>
        tx.knockoutTie.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const fixture = (
        key: string,
        home: string,
        away: string,
        extra: Omit<
          Prisma.MatchUncheckedCreateInput,
          "id" | "seasonId" | "homeTeamId" | "awayTeamId"
        > & { seasonId?: string },
      ): Prisma.MatchUncheckedCreateInput => ({
        id: id(key),
        seasonId: id("league-current"),
        homeTeamId: id(home),
        awayTeamId: id(away),
        observedAt,
        lineupsCoverage:
          extra.status === "FINISHED"
            ? "COMPLETE"
            : extra.lineupsCoverage ?? "UNKNOWN",
        ...extra,
      });
      const matches: Prisma.MatchUncheckedCreateInput[] = [
        fixture("match-live", "harbour", "riverside", {
          stageId: id("league-stage"),
          status: "LIVE",
          homeScore: 2,
          awayScore: 1,
          minute: 67,
          period: "SECOND_HALF",
          kickoffAt: new Date("2026-09-15T19:00:00Z"),
          venueId: id("venue:harbour"),
          eventsCoverage: "COMPLETE",
          lineupsCoverage: "COMPLETE",
          statisticsCoverage: "PARTIAL",
          round: "Matchday 5",
        }),
        fixture("match-halftime", "forest", "summit", {
          stageId: id("league-stage"),
          status: "HALFTIME",
          homeScore: 0,
          awayScore: 0,
          minute: 45,
          kickoffAt: new Date("2026-09-15T19:30:00Z"),
          lineupsCoverage: "PARTIAL",
        }),
        fixture("match-scheduled", "riverside", "forest", {
          status: "SCHEDULED",
          kickoffAt: new Date("2026-09-16T18:30:00Z"),
        }),
        fixture("match-finished", "summit", "harbour", {
          status: "FINISHED",
          homeScore: 1,
          awayScore: 3,
          kickoffAt: new Date("2026-09-14T20:00:00Z"),
        }),
        fixture("match-postponed", "harbour", "forest", {
          status: "POSTPONED",
          kickoffAt: null,
          round: "Date to be confirmed",
        }),
        fixture("match-cancelled", "riverside", "summit", {
          status: "CANCELLED",
          kickoffAt: new Date("2026-09-15T17:00:00Z"),
          eventsCoverage: "NOT_AVAILABLE",
        }),
        fixture("match-abandoned", "summit", "forest", {
          status: "ABANDONED",
          homeScore: 1,
          awayScore: 0,
          minute: 32,
          kickoffAt: new Date("2026-09-15T16:00:00Z"),
          eventsCoverage: "PARTIAL",
        }),
        fixture("history-home", "harbour", "riverside", {
          seasonId: id("league-history"),
          status: "FINISHED",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: new Date("2025-10-10T18:00:00Z"),
        }),
        fixture("history-away", "riverside", "harbour", {
          seasonId: id("league-history"),
          status: "FINISHED",
          homeScore: 0,
          awayScore: 2,
          kickoffAt: new Date("2026-03-10T18:00:00Z"),
        }),
        fixture("match-group", "harbour", "sol", {
          seasonId: id("continental-current"),
          stageId: id("continental-groups"),
          groupId: id("continental-a"),
          status: "FINISHED",
          homeScore: 2,
          awayScore: 0,
          kickoffAt: new Date("2026-08-20T19:00:00Z"),
        }),
        fixture("match-leg-one", "harbour", "rhein", {
          seasonId: id("continental-current"),
          stageId: id("continental-knockout"),
          tieId: id("continental-semi"),
          legNumber: 1,
          status: "FINISHED",
          homeScore: 2,
          awayScore: 1,
          kickoffAt: new Date("2026-09-01T19:00:00Z"),
        }),
        fixture("match-leg-two", "rhein", "harbour", {
          seasonId: id("continental-current"),
          stageId: id("continental-knockout"),
          tieId: id("continental-semi"),
          legNumber: 2,
          status: "FINISHED",
          homeScore: 1,
          awayScore: 1,
          kickoffAt: new Date("2026-09-08T19:00:00Z"),
        }),
        fixture("match-continental-final", "harbour", "sol", {
          seasonId: id("continental-current"),
          stageId: id("continental-knockout"),
          tieId: id("continental-final"),
          legNumber: 1,
          status: "SCHEDULED",
          kickoffAt: new Date("2026-09-22T19:00:00Z"),
        }),
        fixture("match-penalties", "harbour", "riverside", {
          seasonId: id("cup-current"),
          stageId: id("cup-knockout"),
          tieId: id("cup-final"),
          legNumber: 1,
          status: "FINISHED",
          homeScore: 1,
          awayScore: 1,
          period: "PENALTY_SHOOTOUT",
          kickoffAt: new Date("2026-09-12T17:00:00Z"),
        }),
        fixture("match-nations", "sample-england", "sample-spain", {
          seasonId: id("nations-current"),
          stageId: id("nations-groups"),
          groupId: id("nations-a"),
          status: "SCHEDULED",
          kickoffAt: new Date("2026-09-16T20:00:00Z"),
        }),
      ];
      await save("match", matches, (row) =>
        tx.match.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const scores: Prisma.MatchScorePeriodUncheckedCreateInput[] = [
        {
          id: id("score-live-first"),
          matchId: id("match-live"),
          period: "FIRST_HALF",
          homeScore: 1,
          awayScore: 1,
        },
        ...(["REGULATION", "EXTRA_TIME", "PENALTY_SHOOTOUT"] as const).map(
          (period) => ({
            id: id(`score-cup:${period}`),
            matchId: id("match-penalties"),
            period,
            homeScore: period === "PENALTY_SHOOTOUT" ? 5 : 1,
            awayScore: period === "PENALTY_SHOOTOUT" ? 4 : 1,
          }),
        ),
      ];
      await save("scorePeriod", scores, (row) =>
        tx.matchScorePeriod.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const lineups: Prisma.LineupUncheckedCreateInput[] = [
        "harbour",
        "riverside",
      ].map((team) => ({
        id: id(`lineup:${team}`),
        matchId: id("match-live"),
        teamId: id(team),
        managerId: id(`manager:${team}`),
        formation: "4-3-3",
        status: "CONFIRMED",
        observedAt,
      }));
      lineups.push({
        id: id("lineup:forest"),
        matchId: id("match-halftime"),
        teamId: id("forest"),
        formation: null,
        status: "PROVISIONAL",
        observedAt,
      });
      for (const match of matches.filter(
        (entry) => entry.status === "FINISHED",
      )) {
        if (!match.id || !match.homeTeamId || !match.awayTeamId)
          throw new Error("A finished development match is missing its teams.");
        for (const team of [match.homeTeamId, match.awayTeamId]) {
          const teamKey = teams.find((key) => id(key) === team);
          if (!teamKey)
            throw new Error("A finished development match has an unknown team.");
          lineups.push({
            id: id(`lineup:${match.id}:${team}`),
            matchId: match.id,
            teamId: team,
            managerId: id(`manager:${teamKey}`),
            formation: "4-3-3",
            status: "CONFIRMED",
            observedAt,
          });
        }
      }
      await save("lineup", lineups, (row) =>
        tx.lineup.upsert({
          where: { id: row.id! },
          create: row,
          update: row,
        }),
      );
      const pitch = [
        [50, 8],
        [12, 30],
        [37, 30],
        [63, 30],
        [88, 30],
        [20, 55],
        [50, 55],
        [80, 55],
        [15, 82],
        [50, 85],
        [85, 82],
      ];
      const lineupPlayers: Prisma.LineupPlayerUncheckedCreateInput[] =
        lineups.flatMap((lineup) => {
          if (!lineup.id || !lineup.teamId)
            throw new Error("A development lineup is missing its identity.");
          const team = teams.find((key) => id(key) === lineup.teamId);
          if (!team)
            throw new Error("A development lineup has an unknown team.");
          const lineupId = lineup.id;
          const lineupKey = lineupId.replace(/^demo-/, "");
          const playerId = (index: number) =>
            lineupId === id(`lineup:${team}`)
              ? id(`lineup-player:${team}:${index + 1}`)
              : id(`${lineupKey}:player:${index + 1}`);
          return Array.from({ length: 13 }, (_, index) => ({
            id: playerId(index),
            lineupId,
            playerId: id(`${team}:player:${index + 1}`),
            role: index < 11 ? "STARTER" : "SUBSTITUTE",
            shirtNumber: index + 1,
            captain: index === 5,
            position:
              index === 0
                ? "GOALKEEPER"
                : index < 5
                  ? "DEFENDER"
                  : index < 8
                    ? "MIDFIELDER"
                    : "FORWARD",
            positionX: pitch[index]?.[0] ?? null,
            positionY: pitch[index]?.[1] ?? null,
          }));
        });
      await save("lineupPlayer", lineupPlayers, (row) =>
        tx.lineupPlayer.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const event = (
        key: string,
        sequence: number,
        minute: number,
        extra: Omit<
          Prisma.MatchEventUncheckedCreateInput,
          "id" | "matchId" | "sequence" | "minute"
        >,
      ): Prisma.MatchEventUncheckedCreateInput => ({
        id: id(key),
        matchId: id("match-live"),
        sequence,
        minute,
        period: minute <= 45 ? "FIRST_HALF" : "SECOND_HALF",
        observedAt,
        ...extra,
      });
      const events: Prisma.MatchEventUncheckedCreateInput[] = [
        event("event-goal-one", 1, 12, {
          kind: "GOAL",
          teamId: id("harbour"),
          playerId: id("harbour:player:9"),
          assistPlayerId: id("harbour:player:7"),
        }),
        event("event-yellow", 2, 29, {
          kind: "YELLOW_CARD",
          teamId: id("riverside"),
          playerId: id("riverside:player:4"),
        }),
        event("event-equalizer", 3, 45, {
          kind: "PENALTY_GOAL",
          teamId: id("riverside"),
          playerId: id("riverside:player:10"),
          addedMinute: 2,
        }),
        event("event-disallowed", 4, 51, {
          kind: "GOAL",
          teamId: id("riverside"),
          playerId: id("riverside:player:9"),
          status: "DISALLOWED",
          revision: 2,
        }),
        event("event-var", 5, 52, {
          kind: "VAR",
          teamId: id("riverside"),
          relatedEventId: id("event-disallowed"),
          detail: "Sample offside review: goal disallowed",
        }),
        event("event-goal-two", 6, 58, {
          kind: "GOAL",
          teamId: id("harbour"),
          playerId: id("harbour:player:11"),
          assistPlayerId: id("harbour:player:8"),
        }),
        event("event-substitution", 7, 62, {
          kind: "SUBSTITUTION",
          teamId: id("harbour"),
          playerInId: id("harbour:player:12"),
          playerOutId: id("harbour:player:9"),
        }),
        event("event-red", 8, 66, {
          kind: "RED_CARD",
          teamId: id("riverside"),
          playerId: id("riverside:player:5"),
        }),
      ];
      await save("matchEvent", events, (row) =>
        tx.matchEvent.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );

      const standings: Prisma.StandingUncheckedCreateInput[] = [
        "harbour",
        "riverside",
        "forest",
        "summit",
      ].map((team, index) => ({
        id: id(`standing:${team}`),
        seasonId: id("league-current"),
        stageId: id("league-stage"),
        teamId: id(team),
        position: index + 1,
        played: 4,
        won: [3, 2, 1, 0][index],
        drawn: [1, 1, 1, 1][index],
        lost: [0, 1, 2, 3][index],
        goalsFor: [8, 6, 4, 2][index],
        goalsAgainst: [2, 4, 6, 8][index],
        goalDifference: [6, 2, -2, -6][index],
        points: [10, 7, 4, -2][index],
        pointsAdjustment: index === 3 ? -3 : 0,
        form: (
          [
            ["W", "D", "W", "W"],
            ["L", "D", "W", "W"],
            ["W", "L", "D", "L"],
            ["L", "L", "D", "L"],
          ] as Prisma.StandingUncheckedCreateInput["form"][]
        )[index],
        formCoverage: "COMPLETE",
        observedAt,
      }));
      for (const [group, participants] of [
        ["continental-a", ["harbour", "sol"]],
        ["continental-b", ["rhein", "riverside"]],
        ["nations-a", ["sample-england", "sample-spain"]],
      ] as const) {
        for (const [index, team] of participants.entries())
          standings.push({
            id: id(`standing:${group}:${team}`),
            seasonId: id(
              group === "nations-a" ? "nations-current" : "continental-current",
            ),
            stageId: id(
              group === "nations-a" ? "nations-groups" : "continental-groups",
            ),
            groupId: id(group),
            teamId: id(team),
            position: group === "continental-b" ? 1 : index + 1,
            played: group === "continental-a" ? 1 : 0,
            won: group === "continental-a" && index === 0 ? 1 : 0,
            drawn: 0,
            lost: group === "continental-a" && index === 1 ? 1 : 0,
            goalsFor: group === "continental-a" && index === 0 ? 2 : 0,
            goalsAgainst: group === "continental-a" && index === 1 ? 2 : 0,
            goalDifference:
              group === "continental-a" ? (index === 0 ? 2 : -2) : 0,
            points: group === "continental-a" && index === 0 ? 3 : 0,
            form: group === "continental-a" ? [index === 0 ? "W" : "L"] : [],
            formCoverage: "COMPLETE",
            observedAt,
          });
      }
      for (const [index, team] of ["harbour", "riverside"].entries())
        standings.push({
          id: id(`standing:history:${team}`),
          seasonId: id("league-history"),
          teamId: id(team),
          position: index + 1,
          played: 2,
          won: index === 0 ? 1 : 0,
          drawn: 1,
          lost: index === 0 ? 0 : 1,
          goalsFor: index === 0 ? 3 : 1,
          goalsAgainst: index === 0 ? 1 : 3,
          goalDifference: index === 0 ? 2 : -2,
          points: index === 0 ? 4 : 1,
          pointsAdjustment: 0,
          form: index === 0 ? ["D", "W"] : ["D", "L"],
          formCoverage: "COMPLETE",
          observedAt: new Date("2026-06-30T20:00:00Z"),
        });
      await save("standing", standings, (row) =>
        tx.standing.upsert({ where: { id: row.id }, create: row, update: row }),
      );
      const definitions: Prisma.StatisticDefinitionUncheckedCreateInput[] = [
        ...["goals", "assists", "shots", "minutes-played"].map((key) => ({
          id: id(`definition:${key}`),
          key,
          name: key.replaceAll("-", " "),
          unit: key === "minutes-played" ? "minutes" : "count",
          valueType: "COUNT" as const,
          aggregation: "SUM" as const,
        })),
        {
          id: id("definition:possession"),
          key: "possession",
          name: "Possession",
          unit: "percent",
          valueType: "PERCENTAGE",
          aggregation: "RATIO",
        },
        {
          id: id("definition:expected-goals"),
          key: "expected-goals",
          name: "Expected goals",
          unit: "goals",
          valueType: "DECIMAL",
          aggregation: "SUM",
        },
      ];
      await save("definition", definitions, (row) =>
        tx.statisticDefinition.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const contexts: Prisma.StatisticContextUncheckedCreateInput[] = [
        {
          id: id("context:live"),
          scope: "MATCH",
          seasonId: id("league-current"),
          matchId: id("match-live"),
        },
        {
          id: id("context:season"),
          scope: "SEASON",
          seasonId: id("league-current"),
        },
        {
          id: id("context:history"),
          scope: "SEASON",
          seasonId: id("league-history"),
        },
        {
          id: id("context:group"),
          scope: "SEASON",
          seasonId: id("continental-current"),
          stageId: id("continental-groups"),
          groupId: id("continental-a"),
        },
        {
          id: id("context:home"),
          scope: "SEASON",
          seasonId: id("league-current"),
          split: "HOME",
        },
      ];
      await save("context", contexts, (row) =>
        tx.statisticContext.upsert({
          where: { id: row.id },
          create: row,
          update: {},
        }),
      );
      const teamStats: Prisma.TeamStatisticUncheckedCreateInput[] = [];
      for (const [index, team] of ["harbour", "riverside"].entries()) {
        for (const [metric, value] of [
          ["shots", index === 0 ? 12 : 7],
          ["possession", index === 0 ? 58 : 42],
          ["expected-goals", index === 0 ? 1.8 : null],
        ] as const)
          teamStats.push({
            id: id(`stat:${team}:${metric}`),
            contextId: id("context:live"),
            seasonId: id("league-current"),
            teamId: id(team),
            definitionId: id(`definition:${metric}`),
            valueType:
              metric === "shots"
                ? "COUNT"
                : metric === "possession"
                  ? "PERCENTAGE"
                  : "DECIMAL",
            integerValue: metric === "shots" ? value : null,
            decimalValue: metric === "shots" ? null : value,
            observedAt,
          });
      }
      for (const [index, team] of ["harbour", "riverside"].entries()) {
        for (const [metric, value] of [
          ["goals", index === 0 ? 8 : 6],
          ["possession", index === 0 ? 56.4 : 51.3],
          ["expected-goals", index === 0 ? 7.2 : null],
        ] as const)
          teamStats.push({
            id: id(`season-stat:${team}:${metric}`),
            contextId: id("context:season"),
            seasonId: id("league-current"),
            teamId: id(team),
            definitionId: id(`definition:${metric}`),
            valueType:
              metric === "goals"
                ? "COUNT"
                : metric === "possession"
                  ? "PERCENTAGE"
                  : "DECIMAL",
            integerValue: metric === "goals" ? value : null,
            decimalValue: metric === "goals" ? null : value,
            observedAt,
          });
      }
      for (const [index, team] of ["harbour", "sol"].entries())
        teamStats.push({
          id: id(`group-stat:${team}:goals`),
          contextId: id("context:group"),
          seasonId: id("continental-current"),
          teamId: id(team),
          definitionId: id("definition:goals"),
          valueType: "COUNT",
          integerValue: index === 0 ? 2 : 0,
          observedAt,
        });
      await save("teamStatistic", teamStats, (row) =>
        tx.teamStatistic.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      const playerStats: Prisma.PlayerStatisticUncheckedCreateInput[] = [];
      for (const team of ["harbour", "riverside"])
        for (const shirt of [7, 9, 10, 11])
          for (const metric of ["goals", "assists"])
            playerStats.push({
              id: id(`player-stat:${team}:${shirt}:${metric}`),
              contextId: id("context:season"),
              seasonId: id("league-current"),
              teamId: id(team),
              playerId: id(`${team}:player:${shirt}`),
              definitionId: id(`definition:${metric}`),
              valueType: "COUNT",
              integerValue:
                metric === "goals" ? (shirt >= 9 ? 2 : 0) : shirt === 7 ? 3 : 0,
              observedAt,
            });
      playerStats.push({
        id: id("player-stat:history"),
        contextId: id("context:history"),
        seasonId: id("league-history"),
        teamId: id("forest"),
        playerId: id("harbour:player:13"),
        definitionId: id("definition:goals"),
        valueType: "COUNT",
        integerValue: 4,
        observedAt,
      });
      await save("playerStatistic", playerStats, (row) =>
        tx.playerStatistic.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        }),
      );
      for (const row of references)
        await tx.externalReference.upsert({
          where: { id: row.id },
          create: row,
          update: row,
        });
      return { ...counts, references: references.length };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}
