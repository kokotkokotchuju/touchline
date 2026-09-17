import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "../src/server/infrastructure/postgres";
import {
  requireDevelopmentDatabase,
  sampleId,
  seedDevelopmentData,
} from "../prisma/development-data";

let step = "configuration";
const rollback = new Error("Intentional verification rollback");
async function main() {
  loadEnvConfig(process.cwd());
  const db = createDatabaseClient(requireDevelopmentDatabase(process.env));
  const id = sampleId;
  try {
    step = "seed repeatability";
    await seedDevelopmentData(db);
    async function snapshot() {
      const tables = await db.$queryRaw<
        { table_name: string }[]
      >`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '_prisma_migrations' AND table_name NOT IN ('users', 'user_sessions', 'user_favorites', 'user_notification_preferences') ORDER BY table_name`;
      assert.equal(tables.length, 25);
      const result: Record<string, unknown> = {};
      for (const { table_name: table } of tables) {
        // Identifiers come from PostgreSQL's catalog and are quoted, never user input.
        const quoted = '"' + table.replaceAll('"', '""') + '"';
        const columns =
          table === "season_teams"
            ? "season_id::text, team_id::text"
            : table === "matches"
              ? "id::text, public_id::text"
              : "id::text";
        const rows = await db.$queryRawUnsafe(
          `SELECT ${columns} FROM ${quoted} ORDER BY 1${table === "season_teams" ? ", 2" : ""}`,
        );
        assert.ok(
          Array.isArray(rows) && rows.length > 0,
          `${table} must contain sample data`,
        );
        result[table] = rows;
      }
      return result;
    }
    const before = await snapshot();
    const counts = await seedDevelopmentData(db);
    assert.deepEqual(
      await snapshot(),
      before,
      "Repeated seed changed IDs, public IDs or row counts",
    );

    step = "relational reads";
    const match = await db.match.findUniqueOrThrow({
      where: { id: id("match-live") },
      include: {
        homeTeam: { include: { country: true, venue: true } },
        awayTeam: true,
        season: { include: { competition: true } },
        events: {
          orderBy: { sequence: "asc" },
          include: {
            player: true,
            assistPlayer: true,
            playerIn: true,
            playerOut: true,
            relatedEvent: true,
          },
        },
        lineups: {
          include: { players: { include: { player: true } }, manager: true },
        },
        statisticContexts: {
          include: { teamStatistics: { include: { definition: true } } },
        },
      },
    });
    assert.equal(match.status, "LIVE");
    assert.equal(match.events.length, 8);
    assert.equal(match.lineups.length, 2);
    assert.ok(match.lineups.every((lineup) => lineup.players.length === 13));
    assert.equal(
      match.events.find((event) => event.kind === "SUBSTITUTION")?.playerIn?.id,
      id("harbour:player:12"),
    );
    assert.equal(
      match.events.find((event) => event.kind === "VAR")?.relatedEvent?.status,
      "DISALLOWED",
    );
    assert.equal(match.events[0].assistPlayer?.id, id("harbour:player:7"));
    assert.equal(match.statisticContexts[0].teamStatistics.length, 6);
    const statuses = await db.match.findMany({
      where: { references: { some: { providerId: id("provider") } } },
      distinct: ["status"],
      select: { status: true },
    });
    assert.equal(statuses.length, 7);
    const history = await db.match.findMany({
      where: {
        status: "FINISHED",
        seasonId: id("league-history"),
        OR: [
          { homeTeamId: id("harbour"), awayTeamId: id("riverside") },
          { homeTeamId: id("riverside"), awayTeamId: id("harbour") },
        ],
      },
      orderBy: { kickoffAt: "asc" },
    });
    assert.equal(history.length, 2);
    const season = await db.season.findUniqueOrThrow({
      where: { id: id("continental-current") },
      include: {
        stages: {
          include: {
            groups: true,
            ties: { include: { matches: true, nextTie: true } },
          },
        },
        standings: true,
      },
    });
    assert.equal(season.stages.length, 2);
    assert.equal(season.stages.flatMap((stage) => stage.groups).length, 2);
    assert.equal(
      season.stages
        .flatMap((stage) => stage.ties)
        .find((tie) => tie.id === id("continental-semi"))?.matches.length,
      2,
    );
    const penalty = await db.match.findUniqueOrThrow({
      where: { id: id("match-penalties") },
      include: { scores: true },
    });
    assert.equal(penalty.homeScore, 1);
    assert.equal(
      penalty.scores.find((score) => score.period === "PENALTY_SHOOTOUT")
        ?.homeScore,
      5,
    );
    const player = await db.player.findUniqueOrThrow({
      where: { id: id("harbour:player:13") },
      include: { registrations: true, statistics: true },
    });
    assert.equal(player.registrations.length, 2);
    assert.equal(player.statistics[0].teamId, id("forest"));
    assert.equal(player.dateOfBirth, null);

    step = "Prisma create, update, delete, constraint and rollback checks";
    const scratchId = randomUUID();
    try {
      await db.$transaction(
        async (tx) => {
          const country = await tx.country.create({
            data: {
              code: `test-${scratchId}`,
              slug: `test-${scratchId}`,
              name: "Verification country",
            },
          });
          await tx.country.update({
            where: { id: country.id },
            data: { name: "Updated verification country" },
          });
          assert.equal(
            (await tx.country.findUniqueOrThrow({ where: { id: country.id } }))
              .name,
            "Updated verification country",
          );
          await tx.country.delete({ where: { id: country.id } });
          assert.equal(
            await tx.country.count({ where: { id: country.id } }),
            0,
          );
          await tx.country.create({
            data: {
              id: scratchId,
              code: `rollback-${scratchId}`,
              slug: `rollback-${scratchId}`,
              name: "Must roll back",
            },
          });

          const fixture = await tx.match.create({
            data: {
              seasonId: id("league-current"),
              homeTeamId: id("harbour"),
              awayTeamId: id("riverside"),
            },
          });
          await tx.match.update({
            where: { id: fixture.id },
            data: { status: "LIVE", homeScore: 0, awayScore: 0, minute: 1 },
          });
          const lineup = await tx.lineup.create({
            data: {
              matchId: fixture.id,
              teamId: id("harbour"),
              status: "PROVISIONAL",
            },
          });
          await tx.lineupPlayer.create({
            data: {
              lineupId: lineup.id,
              playerId: id("harbour:player:1"),
              role: "STARTER",
            },
          });
          const goal = await tx.matchEvent.create({
            data: {
              matchId: fixture.id,
              teamId: id("harbour"),
              kind: "GOAL",
              sequence: 1,
              minute: 1,
              playerId: id("harbour:player:9"),
            },
          });
          await tx.matchEvent.update({
            where: { id: goal.id },
            data: { status: "DISALLOWED", revision: { increment: 1 } },
          });
          await tx.matchEvent.create({
            data: {
              matchId: fixture.id,
              kind: "VAR",
              sequence: 2,
              minute: 2,
              relatedEventId: goal.id,
            },
          });
          await tx.matchScorePeriod.create({
            data: {
              matchId: fixture.id,
              period: "FIRST_HALF",
              homeScore: 0,
              awayScore: 0,
            },
          });
          const context = await tx.statisticContext.create({
            data: {
              scope: "MATCH",
              seasonId: id("league-current"),
              matchId: fixture.id,
            },
          });
          await tx.teamStatistic.create({
            data: {
              contextId: context.id,
              seasonId: id("league-current"),
              teamId: id("harbour"),
              definitionId: id("definition:shots"),
              valueType: "COUNT",
              integerValue: 1,
            },
          });
          await tx.playerStatistic.create({
            data: {
              contextId: context.id,
              seasonId: id("league-current"),
              teamId: id("harbour"),
              playerId: id("harbour:player:9"),
              definitionId: id("definition:goals"),
              valueType: "COUNT",
              integerValue: 0,
            },
          });
          await tx.externalReference.create({
            data: {
              providerId: id("provider"),
              externalId: `verify:${fixture.id}`,
              matchId: fixture.id,
            },
          });

          // Savepoints keep expected failures from aborting the encompassing rollback test.
          async function rejects(sql: Prisma.Sql) {
            await tx.$executeRawUnsafe("SAVEPOINT expected_failure");
            let rejected = false;
            try {
              await tx.$executeRaw(sql);
            } catch {
              rejected = true;
            }
            await tx.$executeRawUnsafe(
              "ROLLBACK TO SAVEPOINT expected_failure",
            );
            await tx.$executeRawUnsafe("RELEASE SAVEPOINT expected_failure");
            assert.ok(rejected, "Invalid database write was accepted");
          }
          await rejects(
            Prisma.sql`UPDATE matches SET home_score=-1 WHERE id=${fixture.id}::uuid`,
          );
          await rejects(
            Prisma.sql`INSERT INTO lineups(match_id,team_id) VALUES (${fixture.id}::uuid,${id("forest")}::uuid)`,
          );
          await rejects(
            Prisma.sql`INSERT INTO lineups(match_id,team_id) VALUES (${fixture.id}::uuid,${id("harbour")}::uuid)`,
          );
          await rejects(
            Prisma.sql`DELETE FROM players WHERE id=${id("harbour:player:9")}::uuid`,
          );
          await tx.match.delete({ where: { id: fixture.id } });
          assert.equal(
            await tx.matchEvent.count({ where: { matchId: fixture.id } }),
            0,
          );
          assert.equal(
            await tx.lineupPlayer.count({ where: { lineupId: lineup.id } }),
            0,
          );
          assert.equal(
            await tx.matchScorePeriod.count({ where: { matchId: fixture.id } }),
            0,
          );
          assert.equal(
            await tx.statisticContext.count({ where: { id: context.id } }),
            0,
          );
          assert.equal(
            await tx.teamStatistic.count({ where: { contextId: context.id } }),
            0,
          );
          assert.equal(
            await tx.playerStatistic.count({
              where: { contextId: context.id },
            }),
            0,
          );
          assert.equal(
            await tx.externalReference.count({
              where: { matchId: fixture.id },
            }),
            0,
          );
          assert.equal(
            await tx.team.count({
              where: { id: { in: [id("harbour"), id("riverside")] } },
            }),
            2,
          );
          throw rollback;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    assert.equal(await db.country.count({ where: { id: scratchId } }), 0);
    assert.deepEqual(
      await snapshot(),
      before,
      "Verification left persistent records",
    );
    console.log(
      "PASS: 25 populated tables; repeatable seed; nested Prisma reads; all seven statuses; historical/team relations; create/update/delete; foreign keys, uniqueness and checks; detail cascades; transaction rollback.",
    );
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await db.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    `Database verification failed during ${step}. Check the selected development database; no credentials were logged.`,
  );
  process.exitCode = 1;
});
