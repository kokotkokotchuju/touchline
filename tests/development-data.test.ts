import { describe, expect, it } from "vitest";
import {
  requireDevelopmentDatabase,
  sampleId,
} from "../prisma/development-data";

describe("Development data safety", () => {
  const database = "postgresql://example:example@localhost:5432/example";
  it("uses deterministic UUIDs with distinct sample identities", () => {
    expect(sampleId("team:a")).toBe(sampleId("team:a"));
    expect(sampleId("team:a")).not.toBe(sampleId("team:b"));
    expect(sampleId("team:a")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
  it("allows an explicitly selected development database", () => {
    expect(
      requireDevelopmentDatabase({
        DATABASE_URL: database,
        ALLOW_DEVELOPMENT_SEED: "true",
        NODE_ENV: "development",
      }),
    ).toBe(database);
  });
  it.each([
    { DATABASE_URL: database },
    { DATABASE_URL: database, ALLOW_DEVELOPMENT_SEED: "false" },
    {
      DATABASE_URL: database,
      ALLOW_DEVELOPMENT_SEED: "true",
      NODE_ENV: "production" as const,
    },
    { ALLOW_DEVELOPMENT_SEED: "true" },
    { DATABASE_URL: "https://invalid.example", ALLOW_DEVELOPMENT_SEED: "true" },
    { DATABASE_URL: "invalid", ALLOW_DEVELOPMENT_SEED: "true" },
  ])("rejects unsafe or invalid seed configuration %#", (env) => {
    expect(() => requireDevelopmentDatabase(env)).toThrow();
  });
});
