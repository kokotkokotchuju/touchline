import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ScoreDisplay } from "@/components/ui/score-display";
import {
  SAMPLE_REFERENCE_DATE,
  centerKickoff,
  matchesHref,
  statusLabel,
  type CenterMatch,
} from "@/lib/football/match-center";
import { DataBadge } from "./data-badge";

export function MatchCenterShell({
  children,
  view = "matches",
}: {
  children: ReactNode;
  view?: "matches" | "competitions";
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader view={view} />
      <main id="main-content" className="mc-container">
        {children}
      </main>
      <footer className="mc-footer">
        <Link href="/">touchline.</Link>
        <span>The beautiful game, connected.</span>
        <span>Football results and fixtures</span>
      </footer>
    </>
  );
}
export function DataSourceNotice({
  source,
}: {
  source: "development" | "provider";
}) {
  if (source === "provider") {
    return (
      <aside className="mc-sample-note" aria-label="Data source">
        <span className="mc-sample-label">PROVIDER DATA</span>
        <p>Fixtures synchronized from the configured football data provider.</p>
      </aside>
    );
  }
  return (
    <aside className="mc-sample-note" aria-label="Data source">
      <span className="mc-sample-label">SAMPLE DATA</span>
      <p>
        Illustrative fixtures and scores. Live minutes do not update.{" "}
        <Link href={matchesHref(SAMPLE_REFERENCE_DATE)}>
          Explore 15 September 2026
        </Link>
        .
      </p>
    </aside>
  );
}
export function SampleNotice() {
  return <DataSourceNotice source="development" />;
}
export function MatchCenterRow({
  match,
  timeZone = "Europe/Bratislava",
  showDate = false,
}: {
  match: CenterMatch;
  timeZone?: string;
  showDate?: boolean;
}) {
  const active = match.status === "live" || match.status === "halftime";
  const kickoff = match.kickoff
    ? centerKickoff(match.kickoff, timeZone, showDate)
    : "Time TBC";
  const label = `${match.home.name} versus ${match.away.name}, ${statusLabel(match)}${match.homeScore === null ? ", score unknown" : `, ${match.homeScore} to ${match.awayScore}`}${match.shootout ? `, penalties ${match.shootout.home} to ${match.shootout.away}` : ""}`;
  return (
    <Link
      href={match.href}
      prefetch={false}
      className={`mc-match ${active ? "mc-match-live" : ""}`}
      aria-label={`${label}, kickoff ${kickoff}${match.kickoff ? ` ${timeZone}` : ""}`}
    >
      <span className="mc-match-time">
        {match.kickoff ? (
          <time dateTime={match.kickoff}>{kickoff}</time>
        ) : (
          <span>{kickoff}</span>
        )}
        <span className={`mc-match-status mc-status-${match.status}`}>
          {statusLabel(match)}
        </span>
      </span>
      <span className="mc-match-home">
        <DataBadge team={match.home} />
        <span>{match.home.name}</span>
      </span>
      <span className="mc-match-score">
        <ScoreDisplay
          home={match.homeScore}
          away={match.awayScore}
          live={active}
        />
        {match.shootout && (
          <small>
            Pens {match.shootout.home}–{match.shootout.away}
          </small>
        )}
      </span>
      <span className="mc-match-away">
        <DataBadge team={match.away} />
        <span>{match.away.name}</span>
      </span>
      <ArrowUpRight className="mc-match-arrow" size={16} aria-hidden="true" />
    </Link>
  );
}
