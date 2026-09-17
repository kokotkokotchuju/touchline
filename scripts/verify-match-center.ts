import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createDatabaseClient } from "../src/server/infrastructure/postgres";
import { PostgresMatchCenterRepository } from "../src/server/football/repositories/postgres-match-center";
import { matchQuerySchema } from "../src/lib/football/match-center";
import {
  requireDevelopmentDatabase,
  sampleId,
} from "../prisma/development-data";

let step = "configuration";
async function main() {
  loadEnvConfig(process.cwd());
  const db = createDatabaseClient(requireDevelopmentDatabase(process.env));
  const repository = new PostgresMatchCenterRepository(db);
  const created: string[] = [];
  const query = (params: Record<string, string>) =>
    matchQuerySchema.parse(params);
  try {
    step = "dates and combined filters";
    const all = await repository.list(query({ date: "2026-09-15" }));
    assert.equal(all.data.length, 4);
    assert.equal(all.undated.length, 1);
    assert.equal(all.undated[0].kickoff, null);
    const live = await repository.list(
      query({
        date: "2026-09-15",
        status: "live",
        competition: "demo-premier-league",
        country: "england",
      }),
    );
    assert.deepEqual(live.data.map((match) => match.status).sort(), [
      "halftime",
      "live",
    ]);
    assert.equal(
      (
        await repository.list(
          query({ date: "2026-09-15", country: "international" }),
        )
      ).data.length,
      0,
    );
    assert.equal(
      (
        await repository.list(
          query({
            date: "2026-09-16",
            country: "international",
            status: "upcoming",
          }),
        )
      ).data.length,
      1,
    );
    assert.equal(
      (await repository.list(query({ date: "2026-09-14", status: "finished" })))
        .data.length,
      1,
    );
    assert.equal((await repository.catalogue()).competitions.length, 4);
    step = "detail mappings, corrections, lineups and head-to-head";
    const detail = await repository.detail(
      live.data.find((match) => match.status === "live")!.publicId,
    );
    assert.ok(detail);
    assert.equal(detail.events.length, 8);
    assert.equal(detail.lineups.flatMap((lineup) => lineup.players).length, 26);
    assert.equal(detail.events[2].addedMinute, 2);
    assert.equal(
      detail.events.find((event) => event.kind === "SUBSTITUTION")?.playerIn,
      "Sample harbour player 12",
    );
    assert.equal(
      detail.events.find((event) => event.kind === "SUBSTITUTION")?.playerOut,
      "Sample harbour player 9",
    );
    assert.equal(
      detail.events.find((event) => event.status === "DISALLOWED")?.kind,
      "GOAL",
    );
    assert.equal(detail.events[0].assist, "Sample harbour player 7");
    assert.equal(
      detail.statistics.find((stat) => stat.key === "expected-goals")?.away,
      null,
    );
    assert.equal(
      detail.statistics.find((stat) => stat.key === "possession")?.home,
      "58",
    );
    assert.equal(detail.headToHead.length, 3);
    assert.ok(
      detail.headToHead.every(
        (match) => match.kickoff! < detail.match.kickoff!,
      ),
    );
    assert.ok(!JSON.stringify(detail).includes("providerId"));
    assert.ok(!JSON.stringify(detail).includes("externalId"));
    const penaltyRow = await db.match.findUniqueOrThrow({
      where: { id: sampleId("match-penalties") },
    });
    const penalty = await repository.detail(String(penaltyRow.publicId));
    assert.equal(penalty?.match.homeScore, 1);
    assert.equal(penalty?.match.shootout?.home, 5);
    const postponed = await repository.detail(all.undated[0].publicId);
    assert.equal(postponed?.match.kickoff, null);
    assert.equal(postponed?.headToHead.length, 0);
    assert.equal(await repository.detail("9223372036854775807"), null);

    step = "UTC boundary and cursor pagination against PostgreSQL";
    const fixtures = [
      ...Array.from({ length: 103 }, () => ({
        id: randomUUID(),
        kickoffAt: new Date("2098-01-01T12:00:00Z"),
      })),
      { id: randomUUID(), kickoffAt: new Date("2099-12-31T23:59:59.999Z") },
      { id: randomUUID(), kickoffAt: new Date("2100-01-01T00:00:00Z") },
    ];
    created.push(...fixtures.map((fixture) => fixture.id));
    await db.$transaction([
      db.match.createMany({
        data: fixtures.map((fixture) => ({
          ...fixture,
          seasonId: sampleId("league-current"),
          homeTeamId: sampleId("harbour"),
          awayTeamId: sampleId("riverside"),
        })),
      }),
      db.externalReference.createMany({
        data: fixtures.map((fixture) => ({
          providerId: sampleId("provider"),
          externalId: `verification:${fixture.id}`,
          matchId: fixture.id,
        })),
      }),
    ]);
    const first = await repository.list(query({ date: "2098-01-01" }));
    assert.equal(first.data.length, 100);
    assert.equal(first.meta.count, 103);
    assert.ok(first.meta.nextCursor);
    const second = await repository.list(
      query({ date: "2098-01-01", cursor: first.meta.nextCursor }),
    );
    assert.equal(second.data.length, 3);
    assert.equal(second.meta.nextCursor, null);
    assert.equal(
      new Set([...first.data, ...second.data].map((match) => match.id)).size,
      103,
    );
    assert.equal(
      (
        await repository.list(
          query({ date: "2099-12-31", timeZone: "Asia/Tokyo" }),
        )
      ).data.length,
      1,
    );
    assert.equal(
      (
        await repository.list(
          query({ date: "2100-01-01", timeZone: "America/New_York" }),
        )
      ).data.length,
      1,
    );
    console.log(
      "PASS: PostgreSQL match filters, UTC boundaries, live/halftime, undated fixtures, provider-neutral detail DTOs, substitutions/assists/corrections, lineups, unknown statistics, shootouts, prior meetings and 103-row cursor pagination.",
    );
  } finally {
    if (created.length)
      await db.match.deleteMany({ where: { id: { in: created } } });
    await db.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    `Match center verification failed during ${step}; no credentials were logged.`,
  );
  process.exitCode = 1;
});
