"use client";
import { useState } from "react";
import type { FootballSnapshot } from "@/lib/football/types";
import { SiteHeader } from "./layout/site-header";
import {
  CompetitionCard,
  MatchCard,
  PlayerCard,
  StatisticCard,
  TeamCard,
} from "./football/cards";
import { MatchRow } from "./football/match-row";
import { StandingsTable } from "./football/standings-table";
import { CountryFlag } from "./ui/country-flag";
import {
  DateNavigation,
  FilterTabs,
  SearchField,
  SelectFilter,
  Tabs,
} from "./ui/controls";
import { FormIndicator, LiveIndicator } from "./ui/indicators";
import { EmptyState, ErrorState, MatchListSkeleton } from "./ui/states";

export function DesignSystemPreview({
  snapshot,
}: {
  snapshot: FootballSnapshot;
}) {
  const [date, setDate] = useState(snapshot.referenceDate);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const match = snapshot.matches.find((entry) => entry.status === "live")!;
  return (
    <>
      <SiteHeader />
      <main className="design-system-page">
        <header>
          <span className="section-kicker">TOUCHLINE · DESIGN FOUNDATION</span>
          <h1>The game comes first.</h1>
          <p>
            Development-only component reference. All names, numbers, and
            results below are illustrative.
          </p>
        </header>
        <section>
          <h2>Scores, cards, and identities</h2>
          <div className="design-grid">
            <MatchCard match={match} competition="Champions League" sample />
            <TeamCard team={match.home} description="Club · Sample identity" />
            <PlayerCard
              name="Example player"
              position="Midfielder"
              team="Sample club"
              shirtNumber={8}
            />
            <CompetitionCard
              competition={snapshot.competitions[0]}
              href="/competitions"
            />
          </div>
          <div className="design-inline">
            <CountryFlag code="GB-ENG" name="England" />
            <CountryFlag code="ES" name="Spain" />
            <CountryFlag code="DE" name="Germany" />
            <CountryFlag code="FR" name="France" />
            <CountryFlag code="IT" name="Italy" />
            <CountryFlag code="AR" name="Argentina" />
            <LiveIndicator label="Live example" minute={67} />
            <FormIndicator results={["W", "D", "L", "W", "?"]} />
          </div>
          <div className="league-group">
            <MatchRow
              match={match}
              timeZone="UTC"
              saved={saved}
              onSave={() => setSaved(!saved)}
              onOpen={() => setMessage("Match overview interaction received.")}
            />
          </div>
        </section>
        <section>
          <h2>Tables and statistics</h2>
          <div className="design-grid">
            <StatisticCard
              label="Goals"
              value={24}
              detail="Sample season total"
            />
            <StatisticCard
              label="Possession"
              value="57%"
              detail="Sample match"
            />
            <StatisticCard
              label="Expected goals"
              value={null}
              detail="Unavailable values remain unknown"
            />
          </div>
          <StandingsTable
            caption="Example standings — illustrative data"
            rows={[
              {
                id: "sample",
                rank: 1,
                team: match.home,
                played: 10,
                won: 7,
                drawn: 2,
                lost: 1,
                goalDifference: 12,
                points: 23,
                form: ["W", "W", "D", "L", "W"],
              },
            ]}
          />
        </section>
        <section>
          <h2>Search, filters, dates, and tabs</h2>
          <div className="design-controls">
            <SearchField
              label="Search components"
              value={search}
              onChange={setSearch}
            />
            <SelectFilter
              label="Competition filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All competitions" },
                { value: "europe", label: "Europe" },
              ]}
            />
            <FilterTabs
              label="Filter example"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All competitions" },
                { value: "europe", label: "Europe" },
              ]}
            />
          </div>
          <DateNavigation
            date={date}
            today={snapshot.referenceDate}
            onChange={setDate}
          />
          <Tabs
            label="Component documentation"
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: <p>Use arrow keys, Home, and End to switch tabs.</p>,
              },
              {
                id: "accessibility",
                label: "Accessibility",
                content: (
                  <p>
                    Keyboard focus, selected state, and panel labels stay
                    connected.
                  </p>
                ),
              },
            ]}
          />
        </section>
        <section>
          <h2>Loading, empty, and error states</h2>
          <div className="design-grid">
            <MatchListSkeleton />
            <EmptyState
              title="No matches found"
              description="Choose another date or adjust your filters."
            />
            <ErrorState
              action={
                <button
                  className="primary-button"
                  onClick={() => setMessage("Retry interaction received.")}
                >
                  Try again
                </button>
              }
            />
          </div>
        </section>
        <p className="design-feedback" role="status">
          {message}
        </p>
      </main>
    </>
  );
}
