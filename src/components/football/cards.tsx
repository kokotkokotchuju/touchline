import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, UserRound } from "lucide-react";
import type { Competition, FootballMatch, Team } from "@/lib/football/types";
import { CompetitionMark, TeamBadge } from "./marks";
import { ScoreDisplay } from "@/components/ui/score-display";
import { LiveIndicator } from "@/components/ui/indicators";

export function CompetitionCard({
  competition,
  href,
}: {
  competition: Competition;
  href: string;
}) {
  return (
    <Link className="competition-card" href={href}>
      <div className="competition-card-top">
        <CompetitionMark competition={competition} />
        <ArrowUpRight size={18} />
      </div>
      <span className="competition-region">{competition.region}</span>
      <h2>{competition.name}</h2>
      <div className="competition-card-bottom">
        <span>
          {competition.kind === "international"
            ? "International competition"
            : competition.kind === "cup"
              ? "Domestic cup"
              : "Domestic league"}
        </span>
        <ArrowRight size={16} />
      </div>
    </Link>
  );
}

export function TeamCard({
  team,
  description,
  href,
}: {
  team: Team;
  description: string;
  href?: string;
}) {
  const content = (
    <>
      <TeamBadge team={team} large />
      <h3>{team.name}</h3>
      <p>{description}</p>
    </>
  );
  return href ? (
    <Link className="entity-card" href={href}>
      {content}
    </Link>
  ) : (
    <article className="entity-card">{content}</article>
  );
}

export function PlayerCard({
  name,
  position,
  team,
  shirtNumber,
  href,
}: {
  name: string;
  position: string;
  team: string;
  shirtNumber?: number;
  href?: string;
}) {
  const content = (
    <>
      <span className="player-avatar" aria-hidden="true">
        {shirtNumber ?? <UserRound size={28} />}
      </span>
      <span className="section-kicker">{position}</span>
      <h3>{name}</h3>
      <p>{team}</p>
    </>
  );
  return href ? (
    <Link className="entity-card" href={href}>
      {content}
    </Link>
  ) : (
    <article className="entity-card">{content}</article>
  );
}

export function StatisticCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number | null;
  detail?: string;
}) {
  return (
    <article className="statistic-card">
      <h3>{label}</h3>
      <strong>{value ?? "—"}</strong>
      {detail && <p>{detail}</p>}
    </article>
  );
}

export function MatchCard({
  match,
  competition,
  onOpen,
  sample = false,
}: {
  match: FootballMatch;
  competition: string;
  onOpen?: () => void;
  sample?: boolean;
}) {
  return (
    <article className="match-card">
      <div className="card-eyebrow">
        <span>{competition}</span>
        {sample && <span>DEMO</span>}
      </div>
      <div className="match-card-teams">
        <div>
          <TeamBadge team={match.home} large />
          <strong>{match.home.name}</strong>
        </div>
        <ScoreDisplay
          home={match.homeScore}
          away={match.awayScore}
          live={match.status === "live"}
          large
        />
        <div>
          <TeamBadge team={match.away} large />
          <strong>{match.away.name}</strong>
        </div>
      </div>
      {match.status === "live" && (
        <LiveIndicator
          minute={match.minute}
          label={sample ? "Live example" : "Live"}
        />
      )}
      <div className="featured-venue">
        <MapPin size={13} />
        {match.venue}
      </div>
      {onOpen && (
        <button className="featured-button" onClick={onOpen}>
          Match overview <ArrowRight size={15} />
        </button>
      )}
    </article>
  );
}
