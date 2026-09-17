import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import {
  competitionHref,
  type CompetitionPageData,
  type CompetitionLeader,
  type CompetitionTable,
} from "@/lib/football/competition-center";
import {
  readable,
  statusLabel,
  type CenterMatch,
} from "@/lib/football/match-center";
import { FormIndicator } from "@/components/ui/indicators";
import { EmptyState } from "@/components/ui/states";
import { DataBadge } from "./data-badge";
import {
  MatchCenterShell,
  MatchCenterRow,
  SampleNotice,
} from "./match-center-shared";
import {
  CompetitionControls,
  CompetitionEmblem,
  CompetitionLink,
} from "./competition-controls";

function SectionHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="cc-section-heading">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function StandingsTable({ table }: { table: CompetitionTable }) {
  const adjustments = table.rows.filter(
    (row) =>
      row.pointsAdjustment !== null && Number(row.pointsAdjustment) !== 0,
  );
  return (
    <section className="cc-panel cc-table-panel">
      <SectionHeading title={table.name}>
        <span className="cc-muted">Overall table</span>
      </SectionHeading>
      {!table.rows.length ? (
        <EmptyState
          title="Standings unavailable"
          description="No table has been supplied for this stage or group."
        />
      ) : (
        <>
          <p className="cc-scroll-hint">
            Scroll across the table to see every column.
          </p>
          <div
            className="cc-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`${table.name} standings, scroll horizontally for all columns`}
          >
            <table className="cc-standings">
              <caption className="sr-only">
                {table.name} standings. Form runs oldest to newest.
              </caption>
              <thead>
                <tr>
                  {[
                    "Position",
                    "Team",
                    "Played",
                    "Won",
                    "Drawn",
                    "Lost",
                    "Goals for",
                    "Goals against",
                    "Goal difference",
                    "Points",
                    "Form",
                  ].map((name) => (
                    <th key={name} scope="col">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position ?? "—"}</td>
                    <th scope="row">
                      <span className="cc-table-team">
                        <DataBadge team={row.team} />
                        <span>{row.team.name}</span>
                      </span>
                    </th>
                    {[
                      row.played,
                      row.won,
                      row.drawn,
                      row.lost,
                      row.goalsFor,
                      row.goalsAgainst,
                      row.goalDifference,
                    ].map((value, index) => (
                      <td key={index}>{value ?? "—"}</td>
                    ))}
                    <td className="cc-points">
                      {row.points ?? "—"}
                      {row.pointsAdjustment !== null &&
                        Number(row.pointsAdjustment) !== 0 && (
                          <span aria-label="Includes points adjustment">*</span>
                        )}
                    </td>
                    <td>
                      <div className="cc-form">
                        {row.form.length ? (
                          <FormIndicator results={row.form} />
                        ) : (
                          <span>
                            {row.formCoverage === "COMPLETE"
                              ? "No games"
                              : "Unavailable"}
                          </span>
                        )}
                        {row.formCoverage !== "COMPLETE" && (
                          <small>{readable(row.formCoverage)} coverage</small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cc-table-notes">
            <p>
              Stored rankings and points. Form: oldest → newest. — means
              unavailable. Equal positions remain tied; no extra tie-break is
              inferred.
            </p>
            {adjustments.map((row) => (
              <p key={row.id}>
                * {row.team.name}: {Number(row.pointsAdjustment) > 0 ? "+" : ""}
                {row.pointsAdjustment} points adjustment, already included.
              </p>
            ))}
            {table.rows.some((row) => row.observedAt) && (
              <p>
                Latest stored observation:{" "}
                {new Date(
                  Math.max(
                    ...table.rows.flatMap((row) =>
                      row.observedAt ? [Date.parse(row.observedAt)] : [],
                    ),
                  ),
                )
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 16)}{" "}
                UTC. Rows may have different observation times.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function KnockoutRounds({ data }: { data: CompetitionPageData }) {
  const rounds = new Map<
    string,
    { name: string; ties: CompetitionPageData["ties"] }
  >();
  for (const tie of data.ties) {
    const key = `${tie.stageId}:${tie.roundNumber}`;
    if (!rounds.has(key))
      rounds.set(key, { name: `${tie.stage} · ${tie.round}`, ties: [] });
    rounds.get(key)!.ties.push(tie);
  }
  return (
    <section className="cc-knockout">
      <SectionHeading title="Road to the final">
        <Trophy size={20} aria-hidden="true" />
      </SectionHeading>
      <p className="cc-muted">
        Recorded ties and progression. Aggregates follow the team order shown;
        shootouts are separate.
      </p>
      <div className="cc-rounds">
        {[...rounds].map(([key, round]) => (
          <section key={key}>
            <h3 className="cc-round-title">{round.name}</h3>
            <div className="cc-ties">
              {round.ties.map((tie) => (
                <article id={`tie-${tie.id}`} className="cc-tie" key={tie.id}>
                  <span className="cc-eyebrow">
                    Tie {tie.slot}
                    {tie.firstAggregate !== null
                      ? " · Aggregate"
                      : " · Awaiting result"}
                  </span>
                  {(
                    [
                      [tie.first, tie.firstAggregate],
                      [tie.second, tie.secondAggregate],
                    ] as const
                  ).map(([team, score], index) => (
                    <div
                      key={index}
                      className={`cc-tie-team ${team && tie.winnerId === team.id ? "cc-winner" : ""}`}
                    >
                      {team && <DataBadge team={team} />}
                      <span>
                        {team?.name ?? "Team to be confirmed"}
                        {team && tie.winnerId === team.id && (
                          <small>Winner</small>
                        )}
                      </span>
                      <strong>{score ?? "—"}</strong>
                    </div>
                  ))}
                  <ul className="cc-legs">
                    {tie.matches.map((match) => (
                      <li key={match.id}>
                        <CompetitionLink href={match.href}>
                          <span>
                            {match.leg ? `Leg ${match.leg}` : "Match"} ·{" "}
                            {statusLabel(match)}
                            {match.kickoff && (
                              <time dateTime={match.kickoff}>
                                {new Date(match.kickoff)
                                  .toISOString()
                                  .slice(0, 10)}{" "}
                                UTC
                              </time>
                            )}
                          </span>
                          <strong>
                            {match.home.shortName} {match.homeScore ?? "—"} –{" "}
                            {match.awayScore ?? "—"} {match.away.shortName}
                          </strong>
                          {match.shootout && (
                            <small>
                              Penalties {match.shootout.home}–
                              {match.shootout.away} ({match.home.shortName}–
                              {match.away.shortName})
                            </small>
                          )}
                        </CompetitionLink>
                      </li>
                    ))}
                  </ul>
                  {!tie.matches.length && (
                    <p className="cc-muted">Match details unavailable.</p>
                  )}
                  {tie.matchesTruncated && (
                    <p className="cc-muted">First 10 recorded matches shown.</p>
                  )}
                  {tie.next && (
                    <p className="cc-progression">
                      <ArrowRight size={14} aria-hidden="true" />
                      {data.ties.some((item) => item.id === tie.next!.id) ? (
                        <a href={`#tie-${tie.next.id}`}>
                          Winner to {tie.next.round}, tie {tie.next.slot}
                        </a>
                      ) : (
                        <span>
                          Winner to {tie.next.round}, tie {tie.next.slot}
                        </span>
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
function TablesAndRounds({ data }: { data: CompetitionPageData }) {
  return (
    <div className="cc-standings-area">
      {data.tables.map((table) => (
        <StandingsTable key={table.id} table={table} />
      ))}
      {data.ties.length > 0 && <KnockoutRounds data={data} />}
      {!data.tables.length && !data.ties.length && (
        <EmptyState
          title="Standings and rounds unavailable"
          description="No standings or knockout ties have been supplied for this selection."
        />
      )}
      {data.tablesTruncated && (
        <p className="cc-muted">
          Showing the first 1,000 table rows. Select a stage or group to narrow
          the view.
        </p>
      )}
      {data.tiesTruncated && (
        <p className="cc-muted">
          Showing the first 256 ties. Select a stage to narrow the view.
        </p>
      )}
    </div>
  );
}
function Leaderboard({
  title,
  metric,
  rows,
}: {
  title: string;
  metric: string;
  rows: CompetitionLeader[];
}) {
  return (
    <section className="cc-panel cc-leaderboard">
      <SectionHeading title={title}>
        <span className="cc-muted">{metric}</span>
      </SectionHeading>
      {!rows.length ? (
        <EmptyState
          title={`${title} unavailable`}
          description="No player totals have been supplied for this selection."
        />
      ) : (
        <ol aria-label={title}>
          {rows.map((row) => (
            <li key={row.id}>
              <span
                className="cc-rank"
                aria-label={row.rank === null ? "Unranked" : `Rank ${row.rank}`}
              >
                {row.rank ?? "—"}
              </span>
              <span>
                <strong>{row.name}</strong>
                <small>{row.teams}</small>
              </span>
              <b
                aria-label={`${row.value ?? "Unknown"} ${metric.toLowerCase()}`}
              >
                {row.value ?? "—"}
              </b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
function CompetitionStatistics({ data }: { data: CompetitionPageData }) {
  return (
    <div className="cc-statistics">
      <p className="cc-scope-note">
        {data.scopeLabel} · Season totals only. Up to 20 players per
        leaderboard, ranked within available data. Team spells are combined
        once; an unknown spell leaves the total unranked. Coverage may be
        incomplete.
      </p>
      <div className="cc-leader-grid">
        <Leaderboard
          title="Top scorers"
          metric="Goals"
          rows={data.statistics.scorers}
        />
        <Leaderboard
          title="Top assists"
          metric="Assists"
          rows={data.statistics.assists}
        />
      </div>
      {data.section === "stats" && (
        <section className="cc-panel">
          <SectionHeading title="Team statistics">
            <span className="cc-muted">{data.scopeLabel}</span>
          </SectionHeading>
          {!data.statistics.teams.length ? (
            <EmptyState
              title="Team statistics unavailable"
              description="No team season totals have been supplied for this selection."
            />
          ) : (
            <div className="cc-team-metrics">
              {data.statistics.teams.map((item) => (
                <article key={`${item.team.id}:${item.key}`}>
                  <div>
                    <DataBadge team={item.team} />
                    <span>{item.team.name}</span>
                  </div>
                  <p>
                    {readable(item.name)}
                    <strong>
                      {item.value ?? "—"}
                      {item.value !== null && item.unit === "percent"
                        ? "%"
                        : ""}
                    </strong>
                  </p>
                  <small>
                    {item.unit}
                    {item.observedAt
                      ? ` · Observed ${item.observedAt.slice(0, 10)}`
                      : " · Observation time unavailable"}
                  </small>
                </article>
              ))}
            </div>
          )}
          {data.statistics.truncated && (
            <p className="cc-muted">
              Showing the first 200 team metrics. Narrow the stage/group
              selection.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
function MatchBlock({
  title,
  matches,
  action,
}: {
  title: string;
  matches: CenterMatch[];
  action?: React.ReactNode;
}) {
  return (
    <section className="cc-panel">
      <SectionHeading title={title}>{action}</SectionHeading>
      {matches.length ? (
        matches.map((match) => (
          <MatchCenterRow key={match.id} match={match} showDate />
        ))
      ) : (
        <EmptyState
          title="No matches to show"
          description="There are no stored matches for this selection."
        />
      )}
    </section>
  );
}
function CompetitionMatches({ data }: { data: CompetitionPageData }) {
  const { competition, season, query } = data;
  const pages = Math.ceil(data.matchCount / data.matchPageSize);
  return (
    <>
      <nav className="cc-match-filters" aria-label="Competition match filters">
        {(
          [
            ["all", "All matches"],
            ["fixtures", "Fixtures"],
            ["results", "Results"],
          ] as const
        ).map(([key, label]) => (
          <CompetitionLink
            key={key}
            href={competitionHref(competition.slug, "matches", season?.slug, {
              ...query,
              view: key,
              page: 1,
            })}
            current={query.view === key}
          >
            {label}
            <span>{data.counts[key]}</span>
          </CompetitionLink>
        ))}
      </nav>
      <p className="cc-scope-note">
        {data.scopeLabel} · Kickoff times in UTC. Fixtures include scheduled and
        postponed matches; results include finished matches. Other statuses
        appear under All matches.
      </p>
      <MatchBlock
        title={`${query.view === "all" ? "All matches" : readable(query.view)} · ${data.matchCount}`}
        matches={data.matches}
      />
      {pages > 1 && (
        <nav className="cc-pagination" aria-label="Match pages">
          {query.page > 1 && (
            <CompetitionLink
              href={competitionHref(competition.slug, "matches", season?.slug, {
                ...query,
                page: query.page - 1,
              })}
            >
              Previous page
            </CompetitionLink>
          )}
          <span>
            Page {query.page} of {pages}
          </span>
          {query.page < pages && (
            <CompetitionLink
              href={competitionHref(competition.slug, "matches", season?.slug, {
                ...query,
                page: query.page + 1,
              })}
            >
              Next page
            </CompetitionLink>
          )}
        </nav>
      )}
    </>
  );
}
export function CompetitionView({ data }: { data: CompetitionPageData }) {
  const { competition, season, section, query } = data;
  return (
    <MatchCenterShell view="competitions">
      <CompetitionLink href="/competitions" className="cc-back">
        <ArrowLeft size={16} aria-hidden="true" /> All competitions
      </CompetitionLink>
      <header className="cc-hero">
        <div className="cc-hero-identity">
          <CompetitionEmblem
            key={competition.logoUrl}
            name={competition.name}
            logoUrl={competition.logoUrl}
          />
          <div>
            <span className="cc-eyebrow">
              {competition.country?.name ?? competition.region} ·{" "}
              {readable(competition.kind)}
            </span>
            <h1>{competition.name}</h1>
            <p>
              {competition.region} <span aria-hidden="true">/</span>{" "}
              {season?.name ?? "Seasons unavailable"}
            </p>
          </div>
        </div>
        <Trophy
          className="cc-hero-trophy"
          size={180}
          strokeWidth={0.75}
          aria-hidden="true"
        />
      </header>
      <SampleNotice />
      <CompetitionControls data={data} />
      {!season ? (
        <EmptyState
          title="Season data unavailable"
          description="This competition has no stored seasons yet."
        />
      ) : (
        <>
          <div className="cc-context">
            <span>
              {season.name} <span aria-hidden="true">/</span> {data.scopeLabel}
            </span>
            <span>Sample coverage</span>
          </div>
          {section === "overview" && (
            <>
              <dl className="cc-summary">
                <div>
                  <dt>Season teams</dt>
                  <dd>{data.teamCount}</dd>
                </div>
                <div>
                  <dt>Stored matches</dt>
                  <dd>{data.counts.all}</dd>
                </div>
                <div>
                  <dt>Finished</dt>
                  <dd>{data.counts.results}</dd>
                </div>
                <div>
                  <dt>Live / half-time</dt>
                  <dd>
                    {data.counts.live}
                    <span className="cc-snapshot-label">sample snapshot</span>
                  </dd>
                </div>
              </dl>
              <div className="cc-overview-matches">
                <MatchBlock
                  title="Live & upcoming"
                  matches={data.upcoming}
                  action={
                    <CompetitionLink
                      href={competitionHref(
                        competition.slug,
                        "matches",
                        season.slug,
                        query,
                      )}
                      className="mc-text-link"
                    >
                      All matches →
                    </CompetitionLink>
                  }
                />
                <MatchBlock
                  title="Latest results"
                  matches={data.recent}
                  action={
                    <CompetitionLink
                      href={competitionHref(
                        competition.slug,
                        "matches",
                        season.slug,
                        { ...query, view: "results" },
                      )}
                      className="mc-text-link"
                    >
                      All results →
                    </CompetitionLink>
                  }
                />
              </div>
              <TablesAndRounds data={data} />
              <CompetitionStatistics data={data} />
            </>
          )}
          {section === "standings" && <TablesAndRounds data={data} />}
          {section === "matches" && <CompetitionMatches data={data} />}
          {section === "stats" && <CompetitionStatistics data={data} />}
        </>
      )}
    </MatchCenterShell>
  );
}
