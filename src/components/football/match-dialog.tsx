"use client";
import { useEffect, useRef } from "react";
import { CalendarDays, Clock3, MapPin, Star, X } from "lucide-react";
import type { Competition, FootballMatch } from "@/lib/football/types";
import { formatKickoff } from "@/lib/football/filters";
import { CompetitionMark, TeamBadge } from "./marks";

export function MatchDialog({
  match,
  competition,
  timeZone,
  saved,
  onSave,
  onClose,
}: {
  match: FootballMatch;
  competition: Competition;
  timeZone: string;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="match-dialog"
      onClose={onClose}
      aria-labelledby="match-dialog-title"
    >
      <div className="dialog-heading">
        <span className="section-kicker">MATCH OVERVIEW</span>
        <button
          autoFocus
          className="icon-button"
          aria-label="Close match overview"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="dialog-competition">
        <CompetitionMark competition={competition} />
        <span>{competition.name}</span>
      </div>
      <h2 id="match-dialog-title">
        {match.home.name} <span>vs</span> {match.away.name}
      </h2>
      <div className="dialog-score">
        <TeamBadge team={match.home} large />
        <strong>
          {match.homeScore === null
            ? "VS"
            : `${match.homeScore} : ${match.awayScore}`}
        </strong>
        <TeamBadge team={match.away} large />
      </div>
      <div className={`dialog-status status-${match.status}`}>
        {match.status === "live"
          ? `${match.minute}′ · Live example`
          : match.status === "finished"
            ? "Full time · Sample result"
            : "Scheduled · Sample fixture"}
      </div>
      <dl className="match-facts">
        <div>
          <dt>
            <CalendarDays size={16} />
            Date
          </dt>
          <dd>
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "long",
              timeZone,
            }).format(new Date(match.kickoff))}
          </dd>
        </div>
        <div>
          <dt>
            <Clock3 size={16} />
            Kickoff
          </dt>
          <dd>
            {formatKickoff(match.kickoff, timeZone)} ·{" "}
            {timeZone.replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt>
            <MapPin size={16} />
            Stadium
          </dt>
          <dd>{match.venue}</dd>
        </div>
      </dl>
      <button className="primary-button dialog-save" onClick={onSave}>
        <Star size={17} fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved to your matches" : "Save this match"}
      </button>
      <p className="dialog-disclaimer">
        Illustrative fixture and score. This is a preview, not a live match
        report. Saved matches stay in this browser when storage is available.
      </p>
    </dialog>
  );
}
