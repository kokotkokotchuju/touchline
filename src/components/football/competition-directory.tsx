import { ArrowUpRight, Globe2, Search } from "lucide-react";
import {
  directoryHref,
  competitionHref,
  type CompetitionDirectory,
  type DirectoryQuery,
} from "@/lib/football/competition-center";
import { readable } from "@/lib/football/match-center";
import { EmptyState } from "@/components/ui/states";
import { MatchCenterShell, SampleNotice } from "./match-center-shared";
import { CompetitionEmblem, CompetitionLink } from "./competition-controls";

export function CompetitionDirectoryView({
  data,
  query,
}: {
  data: CompetitionDirectory;
  query: DirectoryQuery;
}) {
  const pages = Math.ceil(data.count / data.pageSize);
  return (
    <MatchCenterShell view="competitions">
      <header className="mc-page-heading">
        <div>
          <span className="cc-eyebrow">
            <Globe2 size={15} aria-hidden="true" /> THE WORLD’S GAME
          </span>
          <h1>
            Every competition.
            <br />
            <span className="cc-green">Its own story.</span>
          </h1>
          <p>Follow the tables, the contenders and the road to the final.</p>
        </div>
        <span className="cc-directory-total">
          {data.count}
          <small>competitions found</small>
        </span>
      </header>
      <SampleNotice />
      <form
        action="/competitions"
        method="get"
        className="cc-search"
        role="search"
        aria-label="Competition directory search"
      >
        <label>
          <span>Search competitions</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={100}
            placeholder="Competition, country or region"
          />
        </label>
        <label>
          <span>Competition type</span>
          <select name="kind" defaultValue={query.kind}>
            <option value="all">All types</option>
            <option value="league">Leagues</option>
            <option value="cup">Cups</option>
            <option value="international">International</option>
          </select>
        </label>
        <button className="primary-button" type="submit">
          <Search size={17} aria-hidden="true" /> Search
        </button>
        {(query.q || query.kind !== "all") && (
          <CompetitionLink href="/competitions" className="mc-text-link">
            Clear filters
          </CompetitionLink>
        )}
      </form>
      <div className="cc-catalogue">
        {data.data.map((competition) => (
          <CompetitionLink
            className="cc-competition-card"
            key={competition.id}
            href={competitionHref(competition.slug)}
          >
            <div className="cc-card-top">
              <CompetitionEmblem
                key={competition.logoUrl}
                name={competition.name}
                logoUrl={competition.logoUrl}
              />
              <ArrowUpRight size={20} aria-hidden="true" />
            </div>
            <span className="cc-eyebrow">
              {competition.country?.name ?? "International"} ·{" "}
              {competition.region}
            </span>
            <h2>{competition.name}</h2>
            <p>
              {readable(competition.kind)}
              <span>
                {competition.seasons}{" "}
                {competition.seasons === 1 ? "season" : "seasons"}
              </span>
            </p>
            <span className="cc-card-cta">
              Explore competition <span aria-hidden="true">→</span>
            </span>
          </CompetitionLink>
        ))}
      </div>
      {!data.data.length && (
        <EmptyState
          title="No competitions found"
          description="Try a different name, country or competition type."
          action={
            <CompetitionLink href="/competitions" className="mc-text-link">
              View all competitions
            </CompetitionLink>
          }
        />
      )}
      {pages > 1 && (
        <nav className="cc-pagination" aria-label="Competition pages">
          {query.page > 1 && (
            <CompetitionLink
              href={directoryHref({ ...query, page: query.page - 1 })}
            >
              Previous page
            </CompetitionLink>
          )}
          <span>
            Page {query.page} of {pages}
          </span>
          {query.page < pages && (
            <CompetitionLink
              href={directoryHref({ ...query, page: query.page + 1 })}
            >
              Next page
            </CompetitionLink>
          )}
        </nav>
      )}
    </MatchCenterShell>
  );
}
