import "server-only";

import { ApiFootballProvider } from "./providers/api-football";
import { SportmonksProvider } from "./providers/sportmonks";
import type { ProviderLeaderboardCategory } from "./providers/football-provider";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";

const categories = new Set<ProviderLeaderboardCategory>([
  "goals",
  "assists",
  "yellow_cards",
  "red_cards",
]);

export type PublicLeaderboard = {
  status: "available" | "unavailable";
  category: string;
  provider: string | null;
  rows: Array<{ player: string; team: string; value: number }>;
  reason?: string;
};

export async function getProviderLeaderboard(
  competitionSlug: string,
  category: string,
  requestedSeason?: string,
): Promise<PublicLeaderboard> {
  if (!categories.has(category as ProviderLeaderboardCategory)) {
    return {
      status: "unavailable",
      category,
      provider: null,
      rows: [],
      reason: "The selected provider does not expose this leaderboard.",
    };
  }
  try {
    const db = getDb();
    const providerKey = getServerEnv().FOOTBALL_STATS_PROVIDER ?? "sportmonks";
    const provider = await db.dataProvider.findUnique({
      where: { key: providerKey },
    });
    const competition = await db.competition.findUnique({
      where: { slug: competitionSlug },
      include: {
        references: { where: { provider: { key: providerKey } } },
        seasons: { orderBy: { startsOn: "desc" }, take: 5 },
      },
    });
    if (!provider || !competition)
      return {
        status: "unavailable",
        category,
        provider: null,
        rows: [],
        reason: "No verified provider mapping is available.",
      };
    const season =
      competition.seasons.find((item) => item.name === requestedSeason) ??
      competition.seasons[0];
    const reference = competition.references.find(
      (item) => item.competitionId === competition.id,
    );
    if (!season || !reference)
      return {
        status: "unavailable",
        category,
        provider: provider.name,
        rows: [],
        reason: "No synchronized season is available.",
      };
    const seasonReference = await db.externalReference.findFirst({
      where: { providerId: provider.id, seasonId: season.id },
    });
    if (!seasonReference)
      return {
        status: "unavailable",
        category,
        provider: provider.name,
        rows: [],
        reason: "No provider season mapping is available.",
      };
    const statsProvider =
      providerKey === "sportmonks"
        ? new SportmonksProvider()
        : new ApiFootballProvider();
    const result = await statsProvider.getPlayerLeaderboard(
      reference.externalId,
      seasonReference.externalId,
      category as ProviderLeaderboardCategory,
    );
    return {
      status: "available",
      category,
      provider: provider.name,
      rows: result.data.slice(0, 20).map((row) => ({
        player: row.playerName,
        team: row.teamName,
        value: row.value,
      })),
    };
  } catch {
    return {
      status: "unavailable",
      category,
      provider: getServerEnv().FOOTBALL_STATS_PROVIDER === "sportmonks"
        ? "SportMonks"
        : "API-Football",
      rows: [],
      reason: "Provider statistics are temporarily unavailable.",
    };
  }
}
