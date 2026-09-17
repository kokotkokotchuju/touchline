import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createDatabaseClient } from "../src/server/infrastructure/postgres";
import { PostgresCompetitionRepository } from "../src/server/football/repositories/postgres-competitions";
import {
  competitionQuerySchema,
  directoryQuerySchema,
  type CompetitionSection,
} from "../src/lib/football/competition-center";
import {
  requireDevelopmentDatabase,
  sampleId,
} from "../prisma/development-data";

let step = "configuration";
async function main() {
  loadEnvConfig(process.cwd());
  const db = createDatabaseClient(requireDevelopmentDatabase(process.env));
  const repo = new PostgresCompetitionRepository(db);
  const statIds: string[] = [],
    fixtureIds: string[] = [];
  const id = sampleId;
  const page = (
    slug: string,
    section: CompetitionSection,
    filters: Record<string, string> = {},
    season = "2026-27",
  ) => repo.page(slug, season, section, competitionQuerySchema.parse(filters));
  try {
    step = "directory, league and season resolution";
    const directory = await repo.directory(
      directoryQuerySchema.parse({ q: "England", kind: "cup" }),
    );
    assert.equal(directory.count, 1);
    assert.equal(directory.data[0].slug, "demo-domestic-cup");
    assert.equal(
      (await repo.directory(directoryQuerySchema.parse({ q: "' OR 1=1 --" })))
        .count,
      0,
    );
    assert.equal(await page("does-not-exist", "overview"), null);
    assert.equal(
      await page("demo-premier-league", "overview", {}, "2000-01"),
      null,
    );
    assert.equal(
      await page("demo-premier-league", "overview", { stage: "knockout" }),
      null,
    );
    const league = (await page("demo-premier-league", "overview"))!;
    assert.equal(league.season?.slug, "2026-27");
    assert.equal(league.teamCount, 4);
    assert.deepEqual(league.counts, {
      all: 7,
      fixtures: 2,
      results: 1,
      live: 2,
    });
    assert.equal(league.tables[0].rows.length, 4);
    const summit = league.tables[0].rows.find(
      (row) => row.team.id === id("summit"),
    )!;
    assert.equal(summit.points, "-2");
    assert.equal(summit.pointsAdjustment, "-3");
    assert.deepEqual(league.tables[0].rows[0].form, ["W", "D", "W", "W"]);
    const history = (await page(
      "demo-premier-league",
      "overview",
      {},
      "2025-26",
    ))!;
    assert.equal(history.tables[0].rows.length, 2);
    assert.equal(history.counts.results, 2);
    assert.equal(history.statistics.scorers[0].value, "4");
    assert.equal(league.statistics.scorers[0].value, "2");
    assert.equal(
      league.statistics.teams.find(
        (metric) =>
          metric.team.id === id("harbour") && metric.key === "possession",
      )?.value,
      "56.4",
    );
    assert.equal(
      league.statistics.teams.find(
        (metric) =>
          metric.team.id === id("riverside") && metric.key === "expected-goals",
      )?.value,
      null,
    );
    assert.equal(
      league.statistics.scorers.filter((row) => row.rank === 1).length,
      6,
    );

    step = "mixed formats, groups and knockout progression";
    const mixed = (await page("demo-continental-cup", "standings"))!;
    assert.equal(mixed.tables.length, 2);
    assert.equal(mixed.ties.length, 2);
    assert.deepEqual(
      mixed.tables[1].rows.map((row) => row.position),
      [1, 1],
    );
    const semi = mixed.ties.find((tie) => tie.round === "Semi-final")!;
    assert.equal(semi.firstAggregate, 3);
    assert.equal(semi.secondAggregate, 2);
    assert.equal(semi.matches.length, 2);
    assert.equal(semi.next?.id, id("continental-final"));
    assert.equal(semi.winnerId, id("harbour"));
    const group = (await page("demo-continental-cup", "standings", {
      stage: "group-stage",
      group: "a",
    }))!;
    assert.equal(group.tables.length, 1);
    assert.equal(group.ties.length, 0);
    assert.equal(group.counts.results, 1);
    assert.equal(
      await page("demo-continental-cup", "standings", {
        stage: "knockout",
        group: "a",
      }),
      null,
    );
    const groupStats = (await page("demo-continental-cup", "stats", {
      stage: "group-stage",
      group: "a",
    }))!;
    assert.equal(groupStats.statistics.teams.length, 2);
    assert.equal(
      (await page("demo-continental-cup", "stats"))!.statistics.teams.length,
      0,
      "Group totals must not masquerade as season totals",
    );
    const cup = (await page("demo-domestic-cup", "standings"))!;
    assert.equal(cup.tables.length, 0);
    assert.equal(cup.ties[0].firstAggregate, 1);
    assert.deepEqual(cup.ties[0].matches[0].shootout, { home: 5, away: 4 });
    const fixtures = (await page("demo-premier-league", "matches", {
      view: "fixtures",
    }))!;
    assert.deepEqual(fixtures.matches.map((match) => match.status).sort(), [
      "postponed",
      "scheduled",
    ]);
    assert.ok(
      (await page("demo-premier-league", "matches", {
        view: "results",
      }))!.matches.every((match) => match.status === "finished"),
    );

    step = "cross-team totals, unknown spells and context isolation";
    for (const [context, season, team, value] of [
      ["context:season", "league-current", "forest", 1],
      ["context:season", "league-current", "harbour", 3],
      ["context:home", "league-current", "harbour", 99],
      ["context:live", "league-current", "harbour", 99],
    ] as const) {
      const statisticId = randomUUID();
      statIds.push(statisticId);
      await db.playerStatistic.create({
        data: {
          id: statisticId,
          contextId: id(context),
          seasonId: id(season),
          teamId: id(team),
          playerId: id("harbour:player:13"),
          definitionId: id("definition:goals"),
          valueType: "COUNT",
          integerValue: value,
          references: {
            create: {
              providerId: id("provider"),
              externalId: `verify:${statisticId}`,
            },
          },
        },
      });
    }
    const transferred = (await page("demo-premier-league", "stats"))!.statistics
      .scorers[0];
    assert.equal(transferred.id, id("harbour:player:13"));
    assert.equal(transferred.value, "4");
    assert.equal(transferred.rank, 1);
    assert.ok(
      transferred.teams.includes("Forest") &&
        transferred.teams.includes("Harbour"),
    );
    await db.playerStatistic.update({
      where: { id: statIds[0] },
      data: { integerValue: null },
    });
    const unknown = (await page(
      "demo-premier-league",
      "stats",
    ))!.statistics.scorers.find((row) => row.id === id("harbour:player:13"))!;
    assert.equal(unknown.value, null);
    assert.equal(unknown.rank, null);

    step = "pagination and undated fixture ordering";
    const fixturesToCreate = Array.from({ length: 31 }, (_, index) => ({
      id: randomUUID(),
      kickoffAt: new Date(Date.UTC(2090, 0, 1, 12, index)),
    }));
    fixtureIds.push(...fixturesToCreate.map((row) => row.id));
    await db.$transaction([
      db.match.createMany({
        data: fixturesToCreate.map((row) => ({
          ...row,
          seasonId: id("league-current"),
          homeTeamId: id("harbour"),
          awayTeamId: id("riverside"),
        })),
      }),
      db.externalReference.createMany({
        data: fixtureIds.map((matchId) => ({
          providerId: id("provider"),
          externalId: `verify:${matchId}`,
          matchId,
        })),
      }),
    ]);
    const first = (await page("demo-premier-league", "matches", {
      view: "fixtures",
    }))!;
    const second = (await page("demo-premier-league", "matches", {
      view: "fixtures",
      page: "2",
    }))!;
    assert.equal(first.matchCount, 33);
    assert.equal(first.matches.length, 30);
    assert.equal(second.matches.length, 3);
    assert.equal(second.matches.at(-1)?.status, "postponed");
    assert.equal(
      new Set([...first.matches, ...second.matches].map((match) => match.id))
        .size,
      33,
    );
    JSON.stringify(league);
    JSON.stringify(cup);
    console.log(
      "PASS: competition directory; seasons; standings/points/form/tied ranks; groups and knockout progression/shootouts; fixture/result filters; exact statistic scopes; player team-spell totals and unknowns; 33-row pagination; serializable DTOs.",
    );
  } finally {
    if (statIds.length)
      await db.playerStatistic.deleteMany({ where: { id: { in: statIds } } });
    if (fixtureIds.length)
      await db.match.deleteMany({ where: { id: { in: fixtureIds } } });
    await db.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    `Competition verification failed during ${step}; no credentials were logged.`,
  );
  process.exitCode = 1;
});
