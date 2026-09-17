import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getDb } from "@/server/db";
import { competitionSlug } from "@/lib/football/competition-center";
import {
  mapCenterMatch,
  mapCenterTeam,
  matchInclude,
} from "./repositories/postgres-match-center";

export const getTeamSummary = cache(async (segment: string) => {
  const isId = z.uuid().safeParse(segment).success;
  if (!isId && !competitionSlug.safeParse(segment).success) return null;
  const db = getDb();
  const team = await db.team.findFirst({
    where: isId ? { id: segment } : { slug: segment },
    include: {
      country: true,
      references: {
        include: { provider: { select: { isDevelopment: true } } },
      },
    },
  });
  if (!team) return null;
  const matches = await db.match.findMany({
    where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] },
    include: matchInclude,
    orderBy: [{ kickoffAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    take: 41,
  });
  return {
    team: mapCenterTeam(team),
    country: team.country?.name ?? null,
    sample: team.references.some(
      (reference) => reference.provider.isDevelopment,
    ),
    matches: matches.slice(0, 40).map(mapCenterMatch),
    truncated: matches.length > 40,
  };
});
