import Link from "next/link";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  CircleDot,
  Clock3,
  MapPin,
  Square,
  Trophy,
  Video,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { ScoreDisplay } from "@/components/ui/score-display";
import { Tabs } from "@/components/ui/controls";
import {
  coverageText,
  eventMinute,
  matchesHref,
  readable,
  statusLabel,
  type CenterEvent,
  type CenterLineup,
  type CenterTeam,
  type MatchCenterDetail,
} from "@/lib/football/match-center";
import { DataBadge } from "./data-badge";
import {
  MatchCenterRow,
  MatchCenterShell,
  SampleNotice,
} from "./match-center-shared";

function EventIcon({ kind }: { kind: string }) {
  if (kind.includes("CARD"))
    return (
      <Square
        size={17}
        fill="currentColor"
        className={kind === "YELLOW_CARD" ? "mc-yellow-card" : "mc-red-card"}
        aria-hidden="true"
      />
    );
  if (kind === "SUBSTITUTION")
    return <ArrowRightLeft size={18} aria-hidden="true" />;
  if (kind === "VAR") return <Video size={18} aria-hidden="true" />;
  return <CircleDot size={18} aria-hidden="true" />;
}
function EventBody({ event }: { event: CenterEvent }) {
  return (
    <>
      <div className="mc-event-title">
        <EventIcon kind={event.kind} />
        <strong>{readable(event.kind)}</strong>
        {event.status !== "CONFIRMED" && (
          <span className="mc-event-state">{readable(event.status)}</span>
        )}
      </div>
      {event.kind === "SUBSTITUTION" ? (
        <>
          <p>
            <span className="mc-event-in">On</span>{" "}
            {event.playerIn ?? "Player unavailable"}
          </p>
          <p>
            <span className="mc-event-out">Off</span>{" "}
            {event.playerOut ?? "Player unavailable"}
          </p>
        </>
      ) : (
        <p>
          {event.player ??
            event.manager ??
            (event.kind === "VAR" ? "Video review" : "Player unavailable")}
        </p>
      )}
      {event.assist && (
        <p className="mc-event-secondary">Assist · {event.assist}</p>
      )}
      {event.detail && <p className="mc-event-secondary">{event.detail}</p>}
      {event.relatedEventId && (
        <a className="mc-text-link" href={`#event-${event.relatedEventId}`}>
          Related event
        </a>
      )}
    </>
  );
}
function Timeline({ detail }: { detail: MatchCenterDetail }) {
  return (
    <section className="mc-detail-section">
      <div className="mc-section-heading">
        <h2>Match timeline</h2>
        <span>First whistle → latest event</span>
      </div>
      <p className="mc-subtle">
        {coverageText(detail.coverage.events, "Timeline")}
      </p>
      {!detail.events.length ? (
        <EmptyState
          title="No timeline events to show"
          description={
            detail.coverage.events === "COMPLETE"
              ? "No events have been recorded up to the stored observation."
              : "The available data does not include a timeline for this match."
          }
        />
      ) : (
        <ol className="mc-timeline">
          {detail.events.map((event) => {
            const home = event.teamId === detail.match.home.id;
            const away = event.teamId === detail.match.away.id;
            return (
              <li
                id={`event-${event.id}`}
                key={event.id}
                className={`mc-event ${home ? "mc-event-home" : away ? "mc-event-away" : "mc-event-neutral"} ${event.status === "DISALLOWED" || event.status === "RETRACTED" ? "mc-event-removed" : ""}`}
              >
                <div className="mc-event-time">
                  <strong>
                    {eventMinute(event.minute, event.addedMinute)}
                  </strong>
                  {event.period && <span>{readable(event.period)}</span>}
                </div>
                <div className="mc-event-card">
                  <span className="mc-event-team">
                    {home
                      ? detail.match.home.name
                      : away
                        ? detail.match.away.name
                        : "Match event"}
                  </span>
                  <EventBody event={event} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {detail.eventsTruncated && (
        <p className="mc-subtle">Showing the first 2,000 recorded events.</p>
      )}
    </section>
  );
}
function LineupTeam({
  lineup,
  team,
}: {
  lineup: CenterLineup | undefined;
  team: CenterTeam;
}) {
  const positioned =
    lineup?.players.filter(
      (player) =>
        player.role === "STARTER" && player.x !== null && player.y !== null,
    ) ?? [];
  return (
    <section className="mc-lineup-team">
      <div className="mc-lineup-heading">
        <DataBadge team={team} />
        <h3>{team.name}</h3>
      </div>
      {!lineup ? (
        <EmptyState
          title="Lineup unavailable"
          description="No lineup has been supplied for this team."
        />
      ) : (
        <>
          <div className="mc-lineup-facts">
            <span>
              Formation <strong>{lineup.formation ?? "Unknown"}</strong>
            </span>
            <span className="mc-lineup-status">{readable(lineup.status)}</span>
          </div>
          <p className="mc-subtle">Manager · {lineup.manager ?? "Unknown"}</p>
          {!!positioned.length && (
            <div className="mc-lineup-pitch" aria-hidden="true">
              <span className="mc-attacking">Attacking ↑</span>
              <span className="mc-pitch-half" />
              <span className="mc-pitch-circle" />
              <span className="mc-pitch-box top" />
              <span className="mc-pitch-box bottom" />
              {positioned.map((player) => (
                <div
                  className="mc-pitch-player"
                  key={player.id}
                  style={{
                    left: `${Math.max(9, Math.min(91, player.x!))}%`,
                    bottom: `${Math.max(8, Math.min(88, player.y!))}%`,
                  }}
                >
                  <b>{player.shirtNumber ?? "—"}</b>
                  <span>{player.name.split(" ").slice(-2).join(" ")}</span>
                </div>
              ))}
            </div>
          )}
          {(["STARTER", "SUBSTITUTE"] as const).map((role) => (
            <div className="mc-lineup-list" key={role}>
              <h4>{role === "STARTER" ? "Starting XI" : "Substitutes"}</h4>
              {lineup.players.some((player) => player.role === role) ? (
                <ul>
                  {lineup.players
                    .filter((player) => player.role === role)
                    .map((player) => (
                      <li key={player.id}>
                        <span className="mc-shirt">
                          {player.shirtNumber ?? "—"}
                        </span>
                        <span>
                          {player.name}
                          {player.captain && <abbr title="Captain"> C</abbr>}
                          <small>
                            {player.position
                              ? readable(player.position)
                              : "Position unknown"}
                          </small>
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mc-subtle">No players supplied.</p>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
function Lineups({ detail }: { detail: MatchCenterDetail }) {
  return (
    <section className="mc-detail-section">
      <h2>Lineups & formations</h2>
      <p className="mc-subtle">
        {coverageText(detail.coverage.lineups, "Lineup")}
      </p>
      <div className="mc-lineups-grid">
        {[detail.match.home, detail.match.away].map((team) => (
          <LineupTeam
            key={team.id}
            team={team}
            lineup={detail.lineups.find((lineup) => lineup.teamId === team.id)}
          />
        ))}
      </div>
    </section>
  );
}
function Statistics({ detail }: { detail: MatchCenterDetail }) {
  return (
    <section className="mc-detail-section">
      <h2>Match statistics</h2>
      <p className="mc-subtle">
        {coverageText(detail.coverage.statistics, "Statistics")} Full match to
        the stored observation; unavailable values are shown as —.
      </p>
      {!detail.statistics.length ? (
        <EmptyState
          title="Statistics unavailable"
          description="No full-match statistics have been supplied."
        />
      ) : (
        <>
          <div className="mc-stat-team-labels">
            <span>{detail.match.home.name}</span>
            <span>{detail.match.away.name}</span>
          </div>
          <dl className="mc-statistics">
            {detail.statistics.map((stat) => {
              const known = stat.home !== null && stat.away !== null;
              const total = Number(stat.home) + Number(stat.away);
              const percent =
                known && total > 0 ? (Number(stat.home) / total) * 100 : 50;
              const suffix = stat.valueType === "PERCENTAGE" ? "%" : "";
              return (
                <div key={stat.key}>
                  <dt>{stat.name}</dt>
                  <dd>
                    <strong>
                      {stat.home === null ? "—" : stat.home + suffix}
                    </strong>
                    <span
                      className={`mc-stat-bar ${known && total > 0 ? "" : "mc-stat-unknown"}`}
                      aria-hidden="true"
                    >
                      <i style={{ width: `${percent}%` }} />
                    </span>
                    <strong>
                      {stat.away === null ? "—" : stat.away + suffix}
                    </strong>
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </section>
  );
}
function HeadToHead({ detail }: { detail: MatchCenterDetail }) {
  return (
    <section className="mc-detail-section">
      <h2>Previous meetings</h2>
      <p className="mc-subtle">
        Up to six stored completed meetings before this fixture, across
        competitions. Times are UTC. This is the available sample history.
      </p>
      {detail.headToHead.length ? (
        <div className="mc-h2h-list">
          {detail.headToHead.map((match) => (
            <div key={match.id}>
              <p>
                {match.competition.name} · {match.season}
              </p>
              <MatchCenterRow match={match} showDate />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No previous meetings available"
          description={
            detail.match.kickoff
              ? "No earlier completed meetings are stored for these teams."
              : "A confirmed kickoff is needed to identify earlier meetings."
          }
        />
      )}
    </section>
  );
}
export function MatchDetailView({ detail }: { detail: MatchCenterDetail }) {
  const match = detail.match;
  const live = match.status === "live" || match.status === "halftime";
  const back = match.kickoff
    ? matchesHref(match.kickoff.slice(0, 10))
    : "/";
  return (
    <MatchCenterShell>
      <Link className="mc-back" href={back}>
        <ArrowLeft size={16} />
        Back to matches
      </Link>
      <SampleNotice />
      <section className="mc-scoreboard" aria-labelledby="match-title">
        <div className="mc-scoreboard-competition">
          <Trophy size={18} aria-hidden="true" />
          <span>
            <Link
              href={`/competition/${match.competition.slug}`}
              prefetch={false}
            >
              {match.competition.name}
            </Link>{" "}
            · {match.season}
            {match.round ? ` · ${match.round}` : ""}
          </span>
        </div>
        <h1 id="match-title" className="sr-only">
          {match.home.name} vs {match.away.name}
        </h1>
        <div className="mc-scoreboard-teams">
          <div>
            <DataBadge team={match.home} large />
            <h2>{match.home.name}</h2>
            <span>Home</span>
          </div>
          <div className="mc-main-score">
            <ScoreDisplay
              home={match.homeScore}
              away={match.awayScore}
              large
              live={live}
            />
            <strong
              className={`mc-scoreboard-status mc-status-${match.status}`}
            >
              {statusLabel(match)}
            </strong>
            {match.shootout && (
              <span className="mc-shootout">
                Penalties {match.shootout.home}–{match.shootout.away}
              </span>
            )}
          </div>
          <div>
            <DataBadge team={match.away} large />
            <h2>{match.away.name}</h2>
            <span>Away</span>
          </div>
        </div>
        <dl className="mc-fixture-facts">
          <div>
            <dt>
              <CalendarDays size={15} aria-hidden="true" />
              Kickoff
            </dt>
            <dd>
              {match.kickoff ? (
                <time dateTime={match.kickoff}>
                  {new Intl.DateTimeFormat("en-GB", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(match.kickoff))}{" "}
                  UTC
                </time>
              ) : (
                "To be confirmed"
              )}
            </dd>
          </div>
          <div>
            <dt>
              <MapPin size={15} aria-hidden="true" />
              Venue
            </dt>
            <dd>{match.venue ?? "Venue unavailable"}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={15} aria-hidden="true" />
              Stored observation
            </dt>
            <dd>
              {match.observedAt
                ? new Intl.DateTimeFormat("en-GB", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(match.observedAt)) + " UTC"
                : "Unknown"}
            </dd>
          </div>
        </dl>
        {!!detail.scores.length && (
          <div className="mc-period-scores">
            {detail.scores.map((score) => (
              <span key={score.period}>
                {readable(score.period)}{" "}
                <b>
                  {score.home}–{score.away}
                </b>
              </span>
            ))}
          </div>
        )}
        {detail.tie && (
          <div className="mc-tie-note">
            <strong>
              {detail.tie.round}
              {detail.tie.leg ? ` · Leg ${detail.tie.leg}` : ""}
            </strong>
            {detail.tie.firstScore !== null &&
              detail.tie.secondScore !== null && (
                <span>
                  Aggregate: {detail.tie.first} {detail.tie.firstScore}–
                  {detail.tie.secondScore} {detail.tie.second}
                </span>
              )}
            {detail.tie.winner && <span>Winner: {detail.tie.winner}</span>}
          </div>
        )}
      </section>
      <div className="mc-detail-tabs">
        <Tabs
          label="Match details"
          tabs={[
            {
              id: "timeline",
              label: "Timeline",
              content: <Timeline detail={detail} />,
            },
            {
              id: "lineups",
              label: "Lineups",
              content: <Lineups detail={detail} />,
            },
            {
              id: "statistics",
              label: "Statistics",
              content: <Statistics detail={detail} />,
            },
            {
              id: "head-to-head",
              label: "Head-to-head",
              content: <HeadToHead detail={detail} />,
            },
          ]}
        />
      </div>
    </MatchCenterShell>
  );
}
