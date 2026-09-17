import Link from "next/link";
import { Globe2, Trophy, ArrowRight, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { CountryFlag } from "@/components/ui/country-flag";
import { EmptyState } from "@/components/ui/states";
import {
  getMatchCatalogue,
  getMatchCenterList,
} from "@/server/football/match-center-service";
import {
  groupMatches,
  matchDateSchema,
  matchQuerySchema,
  matchesHref,
  utcToday,
} from "@/lib/football/match-center";
import { MatchCenterControls } from "./match-center-controls";
import { MatchCenterRow, MatchCenterShell } from "./match-center-shared";

export type MatchSearchParams = Record<string, string | string[] | undefined>;
export async function MatchCenterList({
  date,
  searchParams,
}: {
  date: string;
  searchParams: MatchSearchParams;
}) {
  const parsed = matchQuerySchema.omit({ date: true }).safeParse(searchParams);
  if (!matchDateSchema.safeParse(date).success || !parsed.success) notFound();
  const query = { ...parsed.data, date };
  const catalogue = await getMatchCatalogue();
  if (
    (query.country &&
      !catalogue.countries.some((country) => country.slug === query.country)) ||
    (query.competition &&
      !catalogue.competitions.some(
        (competition) => competition.slug === query.competition,
      ))
  )
    notFound();
  const result = await getMatchCenterList(query);
  const groups = groupMatches(result.data);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
  return (
    <MatchCenterShell>
      <div className="mc-page-heading">
        <div>
          <span className="section-kicker">THE MATCH CENTER</span>
          <h1>A whole world of football.</h1>
          <p>From the first whistle to the final score.</p>
        </div>
        <div className="mc-date-title">
          <CalendarClock size={22} aria-hidden="true" />
          <span>
            {label}
            <strong>
              {result.meta.count}{" "}
              {result.meta.count === 1 ? "match" : "matches"}
            </strong>
          </span>
        </div>
      </div>
      <MatchCenterControls
        date={date}
        today={utcToday()}
        query={query}
        catalogue={catalogue}
      />
      <div className="mc-list-layout">
        <div className="mc-country-groups">
          {query.cursor && (
            <Link
              className="mc-text-link"
              href={matchesHref(date, { ...query, cursor: undefined })}
            >
              Back to first matches
            </Link>
          )}
          {groups.length === 0 ? (
            <EmptyState
              title="No matches found"
              description="There are no stored matches for this date and filter combination."
              action={
                <Link className="primary-button" href={matchesHref(date)}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            groups.map((country) => (
              <section
                className="mc-country-group"
                key={country.key}
                aria-labelledby={`country-${country.key}`}
              >
                <h2 id={`country-${country.key}`}>
                  {country.code ? (
                    <CountryFlag code={country.code} name={country.name} />
                  ) : (
                    <Globe2 size={21} aria-hidden="true" />
                  )}
                  {country.name}
                </h2>
                {country.competitions.map((group) => (
                  <section
                    className="mc-competition-group"
                    key={group.competition.id}
                    aria-label={group.competition.name}
                  >
                    <div className="mc-competition-heading">
                      <Trophy size={17} aria-hidden="true" />
                      <h3>
                        <Link
                          href={`/competition/${group.competition.slug}`}
                          prefetch={false}
                        >
                          {group.competition.name}
                        </Link>
                      </h3>
                      <span>
                        {group.matches.length}{" "}
                        {group.matches.length === 1 ? "match" : "matches"}
                      </span>
                    </div>
                    {group.matches.map((match) => (
                      <MatchCenterRow
                        key={match.id}
                        match={match}
                        timeZone={query.timeZone}
                      />
                    ))}
                  </section>
                ))}
              </section>
            ))
          )}
          {result.meta.nextCursor && (
            <Link
              className="primary-button mc-next-page"
              href={matchesHref(date, {
                ...query,
                cursor: result.meta.nextCursor,
              })}
            >
              Next matches <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <aside className="mc-list-aside">
          <div className="mc-editorial-card">
            <Trophy size={26} aria-hidden="true" />
            <span className="section-kicker">EVERY MOMENT MATTERS</span>
            <h2>Follow the story of the game.</h2>
            <p>
              Open a match for its timeline, lineups, statistics and previous
              meetings.
            </p>
            <div className="mc-pitch-motif" aria-hidden="true">
              <span />
            </div>
          </div>
          <section className="mc-undated">
            <h2>Date to be confirmed</h2>
            <p>
              These fixtures have no confirmed kickoff and are separate from the
              selected day.
            </p>
            {result.undated.length ? (
              result.undated.map((match) => (
                <Link
                  prefetch={false}
                  className="mc-undated-match"
                  href={match.href}
                  key={match.id}
                >
                  <span>
                    {match.home.name}
                    <br />
                    vs {match.away.name}
                  </span>
                  <strong>
                    {match.status[0].toUpperCase() + match.status.slice(1)}
                  </strong>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))
            ) : (
              <p className="mc-subtle">
                No undated fixtures match your filters.
              </p>
            )}
            {result.meta.hasMoreUndated && (
              <p className="mc-subtle">Showing six undated fixtures.</p>
            )}
          </section>
        </aside>
      </div>
    </MatchCenterShell>
  );
}
