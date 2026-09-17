import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

const db = new PGlite();
const migrations = ["202609150001_foundation", "202609150002_core_database"];
const ids: Record<string, string> = {};
async function insert(key: string, sql: string, params: unknown[] = []) {
  ids[key] = (
    await db.query<{ id: string }>(`${sql} RETURNING id`, params)
  ).rows[0].id;
  return ids[key];
}
async function migrate(client: PGlite, name: string) {
  await client.exec(
    await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
  );
}
beforeAll(async () => {
  await migrate(db, migrations[0]);
  await insert(
    "country",
    "INSERT INTO countries(code,name) VALUES ('GB-ENG','England')",
  );
  await insert(
    "competition",
    "INSERT INTO competitions(slug,name,kind,region,country_id) VALUES ('legacy','Legacy','league','Europe',$1)",
    [ids.country],
  );
  for (const [key, year] of [
    ["season", 2026],
    ["otherSeason", 2025],
  ] as const) {
    await insert(
      key,
      "INSERT INTO seasons(competition_id,name,starts_on,ends_on) VALUES ($1,$2,$3,$4)",
      [ids.competition, String(year), `${year}-08-01`, `${year + 1}-06-01`],
    );
  }
  for (const key of ["home", "away", "outsider"])
    await insert(
      key,
      "INSERT INTO teams(slug,name,short_name,kind) VALUES ($1,$1,$1,'club')",
      [key],
    );
  await insert(
    "match",
    "INSERT INTO matches(season_id,home_team_id,away_team_id,status,home_score,away_score,venue_name) VALUES ($1,$2,$3,'finished',2,1,'Legacy venue')",
    [ids.season, ids.home, ids.away],
  );
  await insert(
    "provider",
    "INSERT INTO providers(key,name) VALUES ('legacy','Legacy')",
  );
  await insert(
    "reference",
    "INSERT INTO external_references(provider_id,external_id,match_id) VALUES ($1,'42',$2)",
    [ids.provider, ids.match],
  );
  await migrate(db, migrations[1]);
  await db.query("INSERT INTO season_teams(season_id,team_id) VALUES ($1,$2)", [
    ids.season,
    ids.outsider,
  ]);
  for (const [key, kind] of [
    ["stage", "GROUP"],
    ["knockout", "KNOCKOUT"],
  ]) {
    await insert(
      key,
      "INSERT INTO competition_stages(season_id,slug,name,kind,sort_order) VALUES ($1,$2,$2,$3,0)",
      [ids.season, key, kind],
    );
  }
  await insert(
    "group",
    "INSERT INTO competition_groups(season_id,stage_id,slug,name,sort_order) VALUES ($1,$2,'a','Group A',0)",
    [ids.season, ids.stage],
  );
  for (const key of ["player", "otherPlayer"])
    await insert(key, "INSERT INTO players(slug,name) VALUES ($1,$1)", [key]);
  await insert(
    "manager",
    "INSERT INTO managers(slug,name) VALUES ('coach','Coach')",
  );
  await insert(
    "lineup",
    "INSERT INTO lineups(match_id,team_id) VALUES ($1,$2)",
    [ids.match, ids.home],
  );
  await insert(
    "context",
    "INSERT INTO statistic_contexts(scope,season_id,match_id) VALUES ('MATCH',$1,$2)",
    [ids.season, ids.match],
  );
  await insert(
    "count",
    "INSERT INTO statistic_definitions(key,name,unit,value_type,aggregation) VALUES ('goals','Goals','goals','COUNT','SUM')",
  );
  await insert(
    "percentage",
    "INSERT INTO statistic_definitions(key,name,unit,value_type,aggregation) VALUES ('possession','Possession','percent','PERCENTAGE','RATIO')",
  );
  await insert(
    "final",
    "INSERT INTO knockout_ties(season_id,stage_id,round_number,round_name,slot,first_team_id,second_team_id) VALUES ($1,$2,2,'Final',1,$3,$4)",
    [ids.season, ids.knockout, ids.home, ids.away],
  );
  await insert(
    "semi",
    "INSERT INTO knockout_ties(season_id,stage_id,round_number,round_name,slot,next_tie_id,next_slot) VALUES ($1,$2,1,'Semi-final',1,$3,'FIRST')",
    [ids.season, ids.knockout, ids.final],
  );
});
beforeEach(() => db.exec("BEGIN"));
afterEach(() => db.exec("ROLLBACK"));
afterAll(() => db.close());

describe("Core PostgreSQL migration", () => {
  it("also applies both migrations to a fresh database", async () => {
    const fresh = new PGlite();
    try {
      for (const name of migrations) await migrate(fresh, name);
      const result = await fresh.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'",
      );
      expect(result.rows[0].count).toBe(25);
    } finally {
      await fresh.close();
    }
  });
  it("preserves populated foundation IDs, scores and provider mappings and backfills participation", async () => {
    const result = await db.query<{
      id: string;
      home_score: number;
      slug: string;
      public_id: bigint;
      external_id: string;
      venue_name: string;
    }>(
      "SELECT m.id,m.home_score,m.public_id,m.venue_name,s.slug,r.external_id FROM matches m JOIN seasons s ON s.id=m.season_id JOIN external_references r ON r.match_id=m.id WHERE m.id=$1",
      [ids.match],
    );
    expect(result.rows[0]).toMatchObject({
      id: ids.match,
      home_score: 2,
      external_id: "42",
      venue_name: "Legacy venue",
    });
    expect(result.rows[0].slug).toMatch(/^season-/);
    expect(BigInt(result.rows[0].public_id)).toBeGreaterThan(BigInt(0));
    expect(
      (
        await db.query("SELECT * FROM season_teams WHERE season_id=$1", [
          ids.season,
        ])
      ).rows,
    ).toHaveLength(3);
  });
  it.each([
    "scheduled",
    "live",
    "halftime",
    "finished",
    "postponed",
    "cancelled",
    "abandoned",
  ])("supports %s without inventing scores", async (status) => {
    const row = (
      await db.query(
        "INSERT INTO matches(season_id,home_team_id,away_team_id,status) VALUES ($1,$2,$3,$4) RETURNING home_score,away_score,kickoff_at",
        [ids.season, ids.home, ids.away, status],
      )
    ).rows[0];
    expect(row).toEqual({
      home_score: null,
      away_score: null,
      kickoff_at: null,
    });
  });
  const failures: [string, string, () => unknown[], string][] = [
    [
      "cross-season stage",
      "INSERT INTO matches(season_id,home_team_id,away_team_id,stage_id) VALUES ($1,$2,$3,$4)",
      () => [ids.otherSeason, ids.home, ids.away, ids.stage],
      "23503",
    ],
    [
      "group without stage",
      "INSERT INTO matches(season_id,home_team_id,away_team_id,group_id) VALUES ($1,$2,$3,$4)",
      () => [ids.season, ids.home, ids.away, ids.group],
      "23514",
    ],
    [
      "wrong stage for group",
      "INSERT INTO matches(season_id,home_team_id,away_team_id,stage_id,group_id) VALUES ($1,$2,$3,$4,$5)",
      () => [ids.season, ids.home, ids.away, ids.knockout, ids.group],
      "23503",
    ],
    [
      "outside lineup team",
      "INSERT INTO lineups(match_id,team_id) VALUES ($1,$2)",
      () => [ids.match, ids.outsider],
      "23514",
    ],
    [
      "outside event team",
      "INSERT INTO match_events(match_id,team_id,kind,sequence) VALUES ($1,$2,'GOAL',1)",
      () => [ids.match, ids.outsider],
      "23514",
    ],
    [
      "parent participant change",
      "UPDATE matches SET home_team_id=$1 WHERE id=$2",
      () => [ids.outsider, ids.match],
      "23514",
    ],
    [
      "card with assist",
      "INSERT INTO match_events(match_id,kind,sequence,assist_player_id) VALUES ($1,'YELLOW_CARD',1,$2)",
      () => [ids.match, ids.player],
      "23514",
    ],
    [
      "self substitution",
      "INSERT INTO match_events(match_id,kind,sequence,player_in_id,player_out_id) VALUES ($1,'SUBSTITUTION',1,$2,$2)",
      () => [ids.match, ids.player],
      "23514",
    ],
    [
      "added time without minute",
      "INSERT INTO match_events(match_id,kind,sequence,added_minute) VALUES ($1,'GOAL',1,3)",
      () => [ids.match],
      "23514",
    ],
    [
      "negative period score",
      "INSERT INTO match_score_periods(match_id,period,home_score,away_score) VALUES ($1,'REGULATION',-1,0)",
      () => [ids.match],
      "23514",
    ],
    [
      "invalid pitch position",
      "INSERT INTO lineup_players(lineup_id,player_id,role,position_x,position_y) VALUES ($1,$2,'STARTER',101,50)",
      () => [ids.lineup, ids.player],
      "23514",
    ],
    [
      "reversed registration dates",
      "INSERT INTO team_player_registrations(team_id,player_id,starts_on,ends_on) VALUES ($1,$2,'2026-08-01','2025-06-01')",
      () => [ids.home, ids.player],
      "23514",
    ],
    [
      "inconsistent standings",
      "INSERT INTO standings(season_id,team_id,played,won,drawn,lost) VALUES ($1,$2,1,2,0,0)",
      () => [ids.season, ids.home],
      "23514",
    ],
    [
      "wrong statistic shape",
      "INSERT INTO statistic_contexts(scope,season_id) VALUES ('MATCH',$1)",
      () => [ids.season],
      "23514",
    ],
    [
      "duplicate nullable context",
      "INSERT INTO statistic_contexts(scope,season_id,match_id) VALUES ('MATCH',$1,$2)",
      () => [ids.season, ids.match],
      "23505",
    ],
    [
      "moving statistic context",
      "UPDATE statistic_contexts SET period='FIRST_HALF' WHERE id=$1",
      () => [ids.context],
      "23514",
    ],
    [
      "outside statistic team",
      "INSERT INTO team_statistics(context_id,season_id,team_id,definition_id,value_type,integer_value) VALUES ($1,$2,$3,$4,'COUNT',1)",
      () => [ids.context, ids.season, ids.outsider, ids.count],
      "23514",
    ],
    [
      "definition/value type mismatch",
      "INSERT INTO team_statistics(context_id,season_id,team_id,definition_id,value_type,decimal_value) VALUES ($1,$2,$3,$4,'PERCENTAGE',50)",
      () => [ids.context, ids.season, ids.home, ids.count],
      "23503",
    ],
    [
      "percentage over 100",
      "INSERT INTO team_statistics(context_id,season_id,team_id,definition_id,value_type,decimal_value) VALUES ($1,$2,$3,$4,'PERCENTAGE',101)",
      () => [ids.context, ids.season, ids.home, ids.percentage],
      "23514",
    ],
    [
      "backwards knockout progression",
      "UPDATE knockout_ties SET next_tie_id=$1,next_slot='SECOND' WHERE id=$2",
      () => [ids.semi, ids.final],
      "23514",
    ],
    [
      "wrong knockout participant",
      "INSERT INTO matches(season_id,home_team_id,away_team_id,stage_id,tie_id,leg_number) VALUES ($1,$2,$3,$4,$5,1)",
      () => [ids.season, ids.home, ids.outsider, ids.knockout, ids.final],
      "23514",
    ],
    [
      "changing populated stage kind",
      "UPDATE competition_stages SET kind='LEAGUE' WHERE id=$1",
      () => [ids.stage],
      "23514",
    ],
    [
      "multiple provider targets",
      "INSERT INTO external_references(provider_id,external_id,player_id,team_id) VALUES ($1,'bad',$2,$3)",
      () => [ids.provider, ids.player, ids.home],
      "23514",
    ],
    [
      "orphan provider player",
      "INSERT INTO external_references(provider_id,external_id,player_id) VALUES ($1,'missing','00000000-0000-0000-0000-000000000001')",
      () => [ids.provider],
      "23503",
    ],
  ];
  it.each(failures)("rejects %s", async (_name, sql, params, code) => {
    await expect(db.query(sql, params())).rejects.toMatchObject({ code });
  });
  it.each([
    [
      "ungrouped standing",
      "INSERT INTO standings(season_id,team_id) VALUES ($1,$2)",
      () => [ids.season, ids.home],
    ],
    [
      "open registration",
      "INSERT INTO team_player_registrations(team_id,player_id) VALUES ($1,$2)",
      () => [ids.home, ids.player],
    ],
    [
      "open manager assignment",
      "INSERT INTO team_manager_assignments(team_id,manager_id,role) VALUES ($1,$2,'HEAD_COACH')",
      () => [ids.home, ids.manager],
    ],
  ] as const)(
    "deduplicates %s even when scope columns are null",
    async (_name, sql, params) => {
      await db.query(sql, params());
      await expect(db.query(sql, params())).rejects.toMatchObject({
        code: "23505",
      });
    },
  );
  it("allows negative adjusted points and preserves unknown versus zero statistics", async () => {
    await db.query(
      "INSERT INTO standings(season_id,team_id,points,points_adjustment) VALUES ($1,$2,-2,-3)",
      [ids.season, ids.home],
    );
    await db.query(
      "INSERT INTO team_statistics(context_id,season_id,team_id,definition_id,value_type,integer_value) VALUES ($1,$2,$3,$5,'COUNT',NULL),($1,$2,$4,$5,'COUNT',0)",
      [ids.context, ids.season, ids.home, ids.away, ids.count],
    );
    expect(
      (
        await db.query<{ integer_value: number | null }>(
          "SELECT integer_value FROM team_statistics ORDER BY integer_value NULLS FIRST",
        )
      ).rows.map((row) => row.integer_value),
    ).toEqual([null, 0]);
  });
  it("deduplicates external IDs within the new player namespace", async () => {
    await db.query(
      "INSERT INTO external_references(provider_id,external_id,player_id) VALUES ($1,'42',$2)",
      [ids.provider, ids.player],
    );
    await expect(
      db.query(
        "INSERT INTO external_references(provider_id,external_id,player_id) VALUES ($1,'42',$2)",
        [ids.provider, ids.otherPlayer],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("cascades owned match details while preserving teams and players", async () => {
    await db.query(
      "INSERT INTO lineup_players(lineup_id,player_id,role) VALUES ($1,$2,'STARTER')",
      [ids.lineup, ids.player],
    );
    await db.query(
      "INSERT INTO match_events(match_id,kind,sequence) VALUES ($1,'GOAL',1)",
      [ids.match],
    );
    await db.query("DELETE FROM matches WHERE id=$1", [ids.match]);
    for (const table of [
      "lineups",
      "lineup_players",
      "match_events",
      "statistic_contexts",
      "external_references",
    ]) {
      expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
    }
    expect((await db.query("SELECT * FROM players")).rows).toHaveLength(2);
    expect((await db.query("SELECT * FROM teams")).rows).toHaveLength(3);
  });
});
