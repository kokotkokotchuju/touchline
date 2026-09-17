"use client";
import { useState } from "react";
import type { CenterTeam } from "@/lib/football/match-center";
import { getTeamLogoUrl, TeamBadge } from "./marks";

function BadgeImage({ team, large }: { team: CenterTeam; large: boolean }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getTeamLogoUrl(team);
  if (failed || !logoUrl) return <TeamBadge team={team} large={large} />;
  // Assets load in the browser; do not let an image optimizer fetch arbitrary hosts.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`mc-badge-image ${large ? "mc-badge-large" : ""}`}
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
export function DataBadge({
  team,
  large = false,
}: {
  team: CenterTeam;
  large?: boolean;
}) {
  const logoUrl = getTeamLogoUrl(team);
  return logoUrl ? (
    <BadgeImage key={logoUrl} team={team} large={large} />
  ) : (
    <TeamBadge team={team} large={large} />
  );
}
