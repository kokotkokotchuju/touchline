 "use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { Competition, Team } from "@/lib/football/types";

export function normalizeTeamLogoUrl(url: string | null | undefined) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const knownCrestIds: Record<string, number> = {
  arsenal: 57,
  astonvilla: 58,
  chelsea: 61,
  everton: 62,
  fulham: 63,
  liverpool: 64,
  manchestercity: 65,
  newcastleunited: 67,
  nottinghamforest: 351,
  burnley: 328,
  realmadrid: 86,
  bayernmunich: 5,
  barcelona: 81,
  atletico: 78,
  atleticomadrid: 78,
  realbetis: 90,
  sevilla: 559,
  intermilan: 108,
  acmilan: 98,
  juventus: 109,
  napoli: 113,
  borussiadortmund: 4,
  bayerleverkusen: 3,
  parissaintgermain: 524,
  marseille: 516,
};

const knownCompetitionLogos: Record<string, string> = {
  bundesliga: "https://media.api-sports.io/football/leagues/78.png",
  ligue1: "https://media.api-sports.io/football/leagues/61.png",
  premierleague: "https://media.api-sports.io/football/leagues/39.png",
  primeradivision: "https://media.api-sports.io/football/leagues/140.png",
  laliga: "https://media.api-sports.io/football/leagues/140.png",
  seriea: "https://media.api-sports.io/football/leagues/135.png",
  uefachampionsleague: "https://media.api-sports.io/football/leagues/2.png",
  championsleague: "https://media.api-sports.io/football/leagues/2.png",
};

function getCompetitionLogoUrl(competition: Competition) {
  if (competition.name.toLowerCase().includes("primera division")) {
    return "https://media.api-sports.io/football/leagues/140.png";
  }
  const key = competition.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  return knownCompetitionLogos[key] ?? knownCompetitionLogos[competition.id];
}

function fallbackTeamLogoUrl(team: Pick<Team, "name" | "shortName">) {
  const key = team.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  const crestId = knownCrestIds[key];
  return crestId
    ? `https://crests.football-data.org/${crestId}.png`
    : null;
}

export function getTeamLogoUrl(team: Pick<Team, "name" | "shortName" | "logoUrl">) {
  return normalizeTeamLogoUrl(team.logoUrl) ?? fallbackTeamLogoUrl(team);
}

function getBadgeLabel(team: Pick<Team, "name" | "shortName">) {
  const source = (team.shortName || team.name || "T").trim();
  if (!source) return "T";
  const compact = source
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return "T";
  const words = compact.split(" ").filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const initials = words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3);
}

export function TeamBadge({
  team,
  large = false,
}: {
  team: Team;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getTeamLogoUrl(team);
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`team-badge team-badge-image ${large ? "team-badge-large" : ""}`}
        src={logoUrl}
        alt=""
        width={large ? 64 : 32}
        height={large ? 64 : 32}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`team-badge ${large ? "team-badge-large" : ""}`}
      style={{ background: team.color, color: team.accent }}
    >
      <span>{getBadgeLabel(team)}</span>
    </span>
  );
}

export function CompetitionMark({ competition }: { competition: Competition }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getCompetitionLogoUrl(competition);
  return (
    <span
      className="competition-mark"
      style={{
        color: competition.color,
        backgroundColor: `${competition.color}0d`,
      }}
      aria-hidden="true"
    >
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Trophy size={20} strokeWidth={1.7} />
      )}
    </span>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 30 30" fill="none">
        <path
          d="M7 8h16M15 5v20M7 22h16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="15" cy="15" r="5" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}
