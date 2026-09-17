import "server-only";
import { cache } from "react";
import { DemoFootballRepository } from "./repositories/demo-repository";
import { PostgresFootballRepository } from "./repositories/postgres-repository";
import type { FootballReadRepository } from "./repositories/repository";
import { withRedisCache } from "@/server/cache";
import { getServerEnv } from "@/server/env";

function createRepository(): FootballReadRepository {
  const env = getServerEnv();
  if (env.FOOTBALL_READ_MODE === "demo") {
    if (process.env.ALLOW_DEVELOPMENT_SEED !== "true")
      throw new Error("Demo reads require explicit development opt-in.");
    return new DemoFootballRepository();
  }
  if (env.DATABASE_URL) return new PostgresFootballRepository();
  if (process.env.ALLOW_DEVELOPMENT_SEED === "true")
    return new DemoFootballRepository();
  throw new Error("DATABASE_URL is required for public football reads.");
}

export const getFootballSnapshot = cache(() =>
  withRedisCache(
    `football:snapshot:v4:${getServerEnv().FOOTBALL_READ_MODE}:${getServerEnv().FOOTBALL_PROVIDER ?? "demo"}`,
    15,
    () => createRepository().getSnapshot(),
  ),
);
