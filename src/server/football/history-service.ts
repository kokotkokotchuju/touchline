import "server-only";

import { ApiFootballProvider } from "./providers/api-football";
import { getDb } from "@/server/db";

export async function getPreviousChampions(
  competitionSlug: string,
  limit = 10,
) {
  const db = getDb();
  const competition = await db.competition.findUnique({
    where: { slug: competitionSlug },
    include: { references: { where: { provider: { key: "api-football" } } } },
  });
  const reference = competition?.references.find(
    (item) => item.competitionId === competition.id,
  );
  if (!competition || !reference)
    return {
      status: "unavailable" as const,
      provider: null,
      rows: [],
      reason: "No verified provider mapping is available.",
    };

  const provider = new ApiFootballProvider();
  const seasons = (await provider.getSeasons(reference.externalId)).data.slice(
    0,
    limit,
  );
  const rows = [];
  for (const season of seasons) {
    const standings = await provider.getStandings(
      reference.externalId,
      season.externalId,
    );
    const champion = standings.data.find((item) => item.rank === 1);
    if (!champion) continue;
    const teamReference = await db.externalReference.findFirst({
      where: {
        provider: { key: "api-football" },
        externalId: champion.teamExternalId,
        teamId: { not: null },
      },
      include: { team: { select: { name: true } } },
    });
    if (teamReference?.team)
      rows.push({ season: season.name, team: teamReference.team.name });
  }
  return { status: "available" as const, provider: "API-Football", rows };
}
