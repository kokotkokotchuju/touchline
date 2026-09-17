import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const client = new PGlite();
let seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
  providerId: string;

async function insertId(sql: string, values: unknown[] = []) {
  return (await client.query<{ id: string }>(`${sql} RETURNING id`, values))
    .rows[0].id;
}

beforeAll(async () => {
  await client.exec(
    await readFile(
      "prisma/migrations/202609150001_foundation/migration.sql",
      "utf8",
    ),
  );
  const competitionId = await insertId(
    "INSERT INTO competitions (slug, name, kind, region) VALUES ('test-league', 'Test League', 'league', 'Europe')",
  );
  seasonId = await insertId(
    "INSERT INTO seasons (competition_id, name, starts_on, ends_on) VALUES ($1, '2026/27', '2026-08-01', '2027-06-01')",
    [competitionId],
  );
  homeTeamId = await insertId(
    "INSERT INTO teams (slug, name, short_name, kind) VALUES ('test-home', 'Home', 'HOM', 'club')",
  );
  awayTeamId = await insertId(
    "INSERT INTO teams (slug, name, short_name, kind) VALUES ('test-away', 'Away', 'AWY', 'national')",
  );
  providerId = await insertId(
    "INSERT INTO providers (key, name) VALUES ('test-provider', 'Test Provider')",
  );
});
afterAll(() => client.close());

describe("PostgreSQL foundation migration and integrity", () => {
  it("creates the eight foundation tables", async () => {
    const tables = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'",
    );
    expect(tables.rows[0].count).toBe(8);
  });
  it("stores UTC kickoff and preserves unknown scores", async () => {
    const result = await client.query<{
      kickoff_at: Date;
      home_score: number | null;
      away_score: number | null;
    }>(
      "INSERT INTO matches (season_id, home_team_id, away_team_id, kickoff_at) VALUES ($1, $2, $3, $4) RETURNING kickoff_at, home_score, away_score",
      [seasonId, homeTeamId, awayTeamId, "2026-09-15T22:30:00-04:00"],
    );
    expect(result.rows[0].kickoff_at.toISOString()).toBe(
      "2026-09-16T02:30:00.000Z",
    );
    expect(result.rows[0].home_score).toBeNull();
    expect(result.rows[0].away_score).toBeNull();
  });
  it("rejects a team playing itself", async () => {
    await expect(
      client.query(
        "INSERT INTO matches (season_id, home_team_id, away_team_id) VALUES ($1, $2, $2)",
        [seasonId, homeTeamId],
      ),
    ).rejects.toThrow();
  });
  it("rejects negative and unpaired scores", async () => {
    const sql =
      "INSERT INTO matches (season_id, home_team_id, away_team_id, home_score, away_score) VALUES ($1, $2, $3, $4, $5)";
    await expect(
      client.query(sql, [seasonId, homeTeamId, awayTeamId, -1, 0]),
    ).rejects.toThrow();
    await expect(
      client.query(sql, [seasonId, homeTeamId, awayTeamId, 1, null]),
    ).rejects.toThrow();
  });
  it("rejects missing season relationships", async () => {
    await expect(
      client.query(
        "INSERT INTO matches (season_id, home_team_id, away_team_id) VALUES ($1, $2, $3)",
        ["00000000-0000-0000-0000-000000000000", homeTeamId, awayTeamId],
      ),
    ).rejects.toThrow();
  });
  it("requires exactly one real entity per provider reference", async () => {
    await expect(
      client.query(
        "INSERT INTO external_references (provider_id, external_id) VALUES ($1, 'none')",
        [providerId],
      ),
    ).rejects.toThrow();
    await expect(
      client.query(
        "INSERT INTO external_references (provider_id, external_id, team_id, season_id) VALUES ($1, 'both', $2, $3)",
        [providerId, homeTeamId, seasonId],
      ),
    ).rejects.toThrow();
  });
  it("prevents duplicate provider IDs within a type while allowing separate namespaces", async () => {
    await client.query(
      "INSERT INTO external_references (provider_id, external_id, team_id) VALUES ($1, '42', $2)",
      [providerId, homeTeamId],
    );
    await expect(
      client.query(
        "INSERT INTO external_references (provider_id, external_id, team_id) VALUES ($1, '42', $2)",
        [providerId, awayTeamId],
      ),
    ).rejects.toThrow();
    await client.query(
      "INSERT INTO external_references (provider_id, external_id, season_id) VALUES ($1, '42', $2)",
      [providerId, seasonId],
    );
    expect(
      (await client.query("SELECT id FROM external_references")).rows,
    ).toHaveLength(2);
  });
});
