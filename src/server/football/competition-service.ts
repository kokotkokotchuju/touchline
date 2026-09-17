import "server-only";
import { cache } from "react";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { withRedisCache } from "@/server/cache";
import type {
  CompetitionQuery,
  CompetitionSection,
  DirectoryQuery,
} from "@/lib/football/competition-center";
import { utcToday } from "@/lib/football/match-center";
import { PostgresCompetitionRepository } from "./repositories/postgres-competitions";

async function read<T>(key: string, load: () => Promise<T>) {
  try {
    return await withRedisCache(
      `competitions:${getServerEnv().FOOTBALL_READ_MODE ?? "database"}:${getServerEnv().FOOTBALL_PROVIDER ?? "football-data-org"}:v1:${utcToday()}:${key}`,
      30,
      load,
    );
  } catch {
    throw new Error("Competition data is temporarily unavailable.");
  }
}
export const getCompetitionDirectory = (query: DirectoryQuery) =>
  read(`directory:${JSON.stringify(query)}`, () =>
    new PostgresCompetitionRepository(getDb()).directory(query),
  );
const readPage = cache(
  (
    slug: string,
    season: string | undefined,
    section: CompetitionSection,
    query: string,
  ) =>
    read(`page:${slug}:${season ?? "current"}:${section}:${query}`, () =>
      new PostgresCompetitionRepository(getDb()).page(
        slug,
        season,
        section,
        JSON.parse(query) as CompetitionQuery,
      ),
    ),
);
export const getCompetitionPage = (
  slug: string,
  season: string | undefined,
  section: CompetitionSection,
  query: CompetitionQuery,
) => readPage(slug, season, section, JSON.stringify(query));
