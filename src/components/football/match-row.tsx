"use client";
import { ScoreDisplay } from "@/components/ui/score-display";
import { Star } from "lucide-react";
import type { FootballMatch } from "@/lib/football/types";
import { formatKickoff } from "@/lib/football/filters";
import { TeamBadge } from "./marks";

export function MatchRow({
  match,
  timeZone,
  saved,
  onSave,
  onOpen,
}: {
  match: FootballMatch;
  timeZone: string;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`match-row ${match.status === "live" ? "match-is-live" : ""}`}
    >
      <button
        className="match-row-main"
        onClick={onOpen}
        aria-label={`${match.home.name} versus ${match.away.name}, ${match.status}${match.homeScore === null ? "" : `, ${match.homeScore} to ${match.awayScore}`}, match overview`}
      >
        <span className={`match-status status-${match.status}`}>
          {match.status === "live" ? (
            <>
              <span className="live-dot" />
              {match.minute}′
            </>
          ) : match.status === "finished" ? (
            "FT"
          ) : (
            formatKickoff(match.kickoff, timeZone)
          )}
        </span>
        <span className="row-team home-team">
          <span>{match.home.name}</span>
          <TeamBadge team={match.home} />
        </span>
        <ScoreDisplay
          home={match.homeScore}
          away={match.awayScore}
          live={match.status === "live"}
        />
        <span className="row-team away-team">
          <TeamBadge team={match.away} />
          <span>{match.away.name}</span>
        </span>
      </button>
      <button
        className={`save-match icon-button ${saved ? "is-saved" : ""}`}
        aria-label={`${saved ? "Unsave" : "Save"} ${match.home.name} versus ${match.away.name}`}
        aria-pressed={saved}
        onClick={onSave}
      >
        <Star size={17} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
