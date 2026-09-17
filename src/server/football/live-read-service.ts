import "server-only";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { withRedisCache } from "@/server/cache";
import {
  mapCenterMatch,
  matchInclude,
} from "./repositories/postgres-match-center";

/** Visitors read the synchronized store. Only synchronization jobs call a provider. */
export async function getStoredLiveMatches() {
  const development = getServerEnv().FOOTBALL_READ_MODE === "demo";
  return withRedisCache(
    `football:stored-live:v1:${development}`,
    15,
    async () => {
      const matches = await getDb().match.findMany({
        where: {
          status: { in: ["LIVE", "HALFTIME"] },
          references: { some: { provider: { isDevelopment: development } } },
        },
        include: matchInclude,
        orderBy: [{ kickoffAt: { sort: "asc", nulls: "last" } }, { id: "asc" }],
        take: 101,
      });
      return {
        data: matches.slice(0, 100).map(mapCenterMatch),
        source: development ? "development" : "synchronized",
        truncated: matches.length > 100,
      };
    },
  );
}
