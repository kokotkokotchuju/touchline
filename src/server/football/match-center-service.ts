import "server-only";
import { cache } from "react";
import { getDb } from "@/server/db";
import { withRedisCache } from "@/server/cache";
import type { MatchCenterQuery } from "@/lib/football/match-center";
import { PostgresMatchCenterRepository } from "./repositories/postgres-match-center";
import { logRequest } from "@/server/production";
import { getServerEnv } from "@/server/env";

async function read<T>(key: string, load: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await withRedisCache(
        `match-center:${getServerEnv().FOOTBALL_PROVIDER ?? "demo"}:v2:${key}`,
        15,
        load,
      );
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
  logRequest("match_center_read_failed", {
    key,
    error: lastError instanceof Error ? lastError.name : "unknown",
  });
  throw new Error("Match data is temporarily unavailable.");
}
export const getMatchCatalogue = cache(() =>
  read("catalogue", () =>
    new PostgresMatchCenterRepository(getDb()).catalogue(),
  ),
);
export const getMatchCenterList = (query: MatchCenterQuery) =>
  read(`list:${JSON.stringify(query)}`, () =>
    new PostgresMatchCenterRepository(getDb()).list(query),
  );
export const getMatchCenterDetail = cache((publicId: string) =>
  read(`detail:${publicId}`, () =>
    new PostgresMatchCenterRepository(getDb()).detail(publicId),
  ),
);
