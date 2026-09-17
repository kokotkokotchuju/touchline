import { z } from "zod";

// Builders for the agreed URL design. They do not create pages. Until their
// feature phase starts, entity URLs are deliberately absent from navigation.
const segment = (slug: string) =>
  z
    .string()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .parse(slug);
const suffix = (value: string | undefined) =>
  value ? `/${segment(value)}` : "";

export const routes = {
  home: "/",
  matches: (date?: string) =>
    date ? `/matches/${z.iso.date().parse(date)}` : "/matches",
  match: (homeSlug: string, awaySlug: string, publicId: string) =>
    `/match/${segment(homeSlug)}-vs-${segment(awaySlug)}-${z
      .string()
      .regex(/^[1-9][0-9]*$/)
      .parse(publicId)}`,
  competitions: "/competitions",
  competition: (slug: string, section?: "standings" | "matches" | "stats") =>
    `/competition/${segment(slug)}${suffix(section)}`,
  competitionSeason: (
    slug: string,
    seasonSlug: string,
    section?: "standings" | "matches" | "stats",
  ) =>
    `/competition/${segment(slug)}/season/${segment(seasonSlug)}${suffix(section)}`,
  teams: "/teams",
  team: (slug: string, section?: "matches" | "squad" | "stats") =>
    `/team/${segment(slug)}${suffix(section)}`,
  player: (slug: string, section?: "stats") =>
    `/player/${segment(slug)}${suffix(section)}`,
  country: (slug: string) => `/countries/${segment(slug)}`,
  search: (query?: string) =>
    query ? `/search?${new URLSearchParams({ q: query.trim() })}` : "/search",
} as const;
