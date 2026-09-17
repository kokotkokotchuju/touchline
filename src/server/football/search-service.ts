import "server-only";

import { getDb } from "@/server/db";
import { z } from "zod";

export const searchQuery = z.string().trim().max(100).default("");

export type SearchResult = {
  teams: { id: string; name: string; shortName: string }[];
  players: {
    id: string;
    slug: string;
    name: string;
    position: string | null;
  }[];
  competitions: { id: string; slug: string; name: string; region: string }[];
};

export async function searchFootball(query: string): Promise<SearchResult> {
  const normalized = searchQuery.parse(query);
  if (normalized.length < 2)
    return { teams: [], players: [], competitions: [] };
  const db = getDb();
  const [teams, players, competitions] = await Promise.all([
    db.team.findMany({
      where: { name: { contains: normalized, mode: "insensitive" } },
      select: { id: true, name: true, shortName: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 20,
    }),
    db.player.findMany({
      where: { name: { contains: normalized, mode: "insensitive" } },
      select: { id: true, slug: true, name: true, position: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 20,
    }),
    db.competition.findMany({
      where: {
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          { region: { contains: normalized, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, name: true, region: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 20,
    }),
  ]);
  return { teams, players, competitions };
}
