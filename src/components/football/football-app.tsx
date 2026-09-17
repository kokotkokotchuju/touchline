"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { DateNavigation } from "@/components/ui/controls";
import { HomeHighlights } from "./home-highlights";
import { CompetitionCard } from "./cards";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Globe2,
  Radio,
  Search,
  SlidersHorizontal,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type {
  CompetitionKind,
  FootballMatch,
  FootballSnapshot,
  MatchStatus,
} from "@/lib/football/types";
import {
  dateInTimeZone,
  filterMatches,
  TIME_ZONES,
} from "@/lib/football/filters";
import { CompetitionMark } from "./marks";
import { MatchRow } from "./match-row";
import { MatchDialog } from "./match-dialog";
import { useSavedMatches } from "./use-saved-matches";

interface Props {
  snapshot: FootballSnapshot;
  view?: "matches" | "competitions";
  initialCompetition?: string;
  initialSaved?: boolean;
}
const statusOptions: { id: "all" | MatchStatus; label: string }[] = [
  { id: "all", label: "All matches" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Upcoming" },
  { id: "finished", label: "Finished" },
];

export function FootballApp({
  snapshot,
  view = "matches",
  initialCompetition = "",
  initialSaved = false,
}: Props) {
  const [date, setDate] = useState(snapshot.referenceDate);
  const [timeZone, setTimeZone] = useState("Europe/Bratislava");
  const [status, setStatus] = useState<"all" | MatchStatus>("all");
  const [competitionId, setCompetitionId] = useState(initialCompetition);
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(initialSaved);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(
    null,
  );
  const [competitionKind, setCompetitionKind] = useState<
    "all" | CompetitionKind
  >("all");
  const saved = useSavedMatches();
  const dayMatches = snapshot.matches.filter(
    (match) => dateInTimeZone(match.kickoff, timeZone) === date,
  );
  const filtered = filterMatches(snapshot.matches, {
    date,
    timeZone,
    status,
    competitionId,
    query,
    savedOnly,
    savedIds: saved.ids,
  });
  const groups = snapshot.competitions
    .map((competition) => ({
      competition,
      matches: filtered.filter(
        (match) => match.competitionId === competition.id,
      ),
    }))
    .filter((group) => group.matches.length);
  const liveCount = dayMatches.filter(
    (match) => match.status === "live",
  ).length;

  const currentCompetition = snapshot.competitions.find(
    (competition) => competition.id === competitionId,
  );
  const visibleCompetitions = snapshot.competitions.filter(
    (competition) =>
      (competitionKind === "all" || competition.kind === competitionKind) &&
      `${competition.name} ${competition.region}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function resetFilters() {
    setQuery("");
    setStatus("all");
    setCompetitionId("");
    setSavedOnly(false);
  }

  return (
    <div className="app-root home-dashboard">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader
        view={view}
        initialSaved={initialSaved}
        savedCount={saved.ids.length}
      />
      <div className="workspace">
        <aside className="sidebar" aria-label="Football navigation">
          {view === "matches" ? (
            <>
              <button
                className={`side-item ${!competitionId && !savedOnly && status === "all" ? "selected" : ""}`}
                onClick={resetFilters}
              >
                <Globe2 size={18} /> All matches{" "}
                <span className="side-count">{dayMatches.length}</span>
              </button>
              <button
                className={`side-item ${status === "live" ? "selected" : ""}`}
                onClick={() => {
                  resetFilters();
                  setStatus("live");
                }}
              >
                <Radio size={18} /> Live now{" "}
                <span className="live-counter">{liveCount}</span>
              </button>
              {(
                [
                  ["scheduled", "Upcoming"],
                  ["finished", "Finished"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`side-item ${status === value ? "selected" : ""}`}
                  onClick={() => {
                    resetFilters();
                    setStatus(value);
                  }}
                >
                  <CalendarDays size={18} />
                  {label}
                </button>
              ))}
              <button
                className={`side-item ${savedOnly ? "selected" : ""}`}
                onClick={() => {
                  resetFilters();
                  setSavedOnly(true);
                }}
              >
                <Star size={18} /> Saved matches
              </button>
            </>
          ) : (
            <>
              <Link className="side-item" href="/">
                <Globe2 size={18} /> All matches
              </Link>
              <Link className="side-item selected" href="/competitions">
                <Trophy size={18} /> Competitions
              </Link>
              <Link className="side-item" href="/?saved=1">
                <Star size={18} /> Saved matches
              </Link>
            </>
          )}
          <div className="sidebar-divider" />
          <div className="home-following">
            <div className="sidebar-label">
              FOLLOWING <Link href="/my-football">+ Add teams</Link>
            </div>
            <p>
              Follow your favourite teams to get personalised fixtures and
              updates.
            </p>
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-label">POPULAR COMPETITIONS</div>
          <div className="league-nav">
            {snapshot.competitions.slice(0, 6).map((competition) =>
              view === "matches" ? (
                <button
                  className={`side-item ${competitionId === competition.id ? "selected" : ""}`}
                  key={competition.id}
                  onClick={() => {
                    setCompetitionId(competition.id);
                    setQuery("");
                  }}
                >
                  <CompetitionMark competition={competition} />
                  <span>{competition.shortName}</span>
                </button>
              ) : (
                <Link
                  className="side-item"
                  key={competition.id}
                  href={`/?competition=${competition.id}`}
                >
                  <CompetitionMark competition={competition} />
                  <span>{competition.shortName}</span>
                </Link>
              ),
            )}
          </div>
          <Link href="/competitions" className="all-competitions">
            All competitions <ArrowRight size={14} />
          </Link>
        </aside>
        <main id="main-content" className="main-content">
          <div className="breadcrumb">
            Football <ChevronRight size={13} />{" "}
            <span>{view === "matches" ? "Match centre" : "Competitions"}</span>
          </div>
          {view === "matches" ? (
            <>
              <section className="hero" aria-labelledby="hero-title">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> THE WORLD’S GAME. LIVE.
                  </div>
                  <h1 id="hero-title">
                    Every match.
                    <br />
                    One place.
                  </h1>
                  <p>
                    Live scores, fixtures, tables and more.
                    <br className="desktop-break" /> Your front-row seat to
                    world football.
                  </p>
                </div>
                <div className="home-hero-signature">
                  Football
                  <br />
                  Lives Here.
                </div>
              </section>
              <div className="content-heading" id="match-centre">
                <div>
                  <div className="section-kicker">THE MATCH CENTRE</div>
                  <h2>
                    {savedOnly
                      ? "Your saved matches"
                      : (currentCompetition?.shortName ?? "Today's matches")}
                  </h2>
                </div>
                <label className="timezone-control">
                  <Globe2 size={14} />
                  <span className="sr-only">Time zone</span>
                  <select
                    aria-label="Time zone"
                    value={timeZone}
                    onChange={(event) => setTimeZone(event.target.value)}
                  >
                    {TIME_ZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone === "UTC"
                          ? "UTC"
                          : zone.split("/")[1].replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="demo-notice">
                <span className="demo-dot" />
                {snapshot.source === "demo"
                  ? " Sample fixtures and scores. Preview data does not update live."
                  : " Provider-synchronized fixtures. Live status depends on the latest sync."}
              </div>
              <section className="match-controls" aria-label="Match filters">
                <DateNavigation
                  date={date}
                  today={snapshot.referenceDate}
                  onChange={setDate}
                />
                <div className="filter-strip">
                  <div
                    className="status-tabs"
                    role="group"
                    aria-label="Match status"
                  >
                    {statusOptions.map((option) => (
                      <button
                        key={option.id}
                        aria-pressed={status === option.id}
                        className={status === option.id ? "active" : ""}
                        onClick={() => setStatus(option.id)}
                      >
                        {option.id === "live" && <span className="live-dot" />}
                        {option.label}
                        {option.id === "live" && (
                          <span className="tab-count">{liveCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`saved-filter icon-button ${savedOnly ? "is-saved" : ""}`}
                    aria-label="Show saved matches only"
                    aria-pressed={savedOnly}
                    onClick={() => setSavedOnly(!savedOnly)}
                  >
                    <Star
                      size={17}
                      fill={savedOnly ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="search-strip">
                  <label className="match-search">
                    <Search size={17} />
                    <input
                      aria-label="Search matches"
                      placeholder="Search a team or stadium…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        className="icon-button"
                        onClick={() => setQuery("")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <label className="competition-filter">
                    <SlidersHorizontal size={15} />
                    <select
                      aria-label="Filter competition"
                      value={competitionId}
                      onChange={(event) => setCompetitionId(event.target.value)}
                    >
                      <option value="">All competitions</option>
                      {snapshot.competitions.map((competition) => (
                        <option value={competition.id} key={competition.id}>
                          {competition.shortName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              <div className="match-list-summary" aria-live="polite">
                <span>
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "match" : "matches"}
                  {savedOnly ? " saved for this day" : " on your radar"}
                </span>
                {date !== snapshot.referenceDate && (
                  <button onClick={() => setDate(snapshot.referenceDate)}>
                    Back to today
                  </button>
                )}
                <span>
                  Times in{" "}
                  {timeZone === "UTC"
                    ? "UTC"
                    : timeZone.split("/")[1].replaceAll("_", " ")}
                </span>
              </div>
              <div className="match-groups">
                {groups.map(({ competition, matches }) => (
                  <section
                    className="league-group"
                    key={competition.id}
                    aria-label={competition.name}
                  >
                    <div className="league-heading">
                      <CompetitionMark competition={competition} />
                      <div>
                        <h3>{competition.name}</h3>
                        <span>
                          {competition.region}{" "}
                          <span className="tiny-divider">/</span> Preview season
                        </span>
                      </div>
                      <span className="league-match-count">
                        {matches.length}{" "}
                        {matches.length === 1 ? "match" : "matches"}
                      </span>
                    </div>
                    {matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        timeZone={timeZone}
                        saved={saved.ids.includes(match.id)}
                        onSave={() => saved.toggle(match.id)}
                        onOpen={() => {
                          if (
                            snapshot.source === "provider" &&
                            match.detailHref
                          ) {
                            window.location.href = match.detailHref;
                            return;
                          }
                          setSelectedMatch(match);
                        }}
                      />
                    ))}
                  </section>
                ))}
              </div>
              {!groups.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No matches found</h3>
                  <p>
                    {savedOnly
                      ? "Star a match to save it, or choose another day."
                      : snapshot.source === "demo"
                        ? "Try another date, competition, or team. Sample fixtures cover five days around today."
                        : "Try another date, competition, or team. No synchronized matches match these filters."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      resetFilters();
                      setDate(snapshot.referenceDate);
                    }}
                  >
                    Show today’s matches <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <div className="end-note">
                <Check size={15} /> You’re all caught up for this view.
              </div>
            </>
          ) : (
            <>
              <div className="directory-heading">
                <div className="section-kicker">A WORLD OF FOOTBALL</div>
                <h1>Find your competition.</h1>
                <p>
                  Local rivalries. Continental nights. The stages that make the
                  game.
                </p>
              </div>
              <div className="demo-notice">
                <span className="demo-dot" /> Preview catalogue · Competition
                coverage will depend on the data provider.
              </div>
              <section
                className="directory-controls"
                aria-label="Competition filters"
              >
                <label className="match-search">
                  <Search size={18} />
                  <input
                    aria-label="Search competitions"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search competitions or countries…"
                  />
                </label>
                <div
                  className="status-tabs"
                  role="group"
                  aria-label="Competition type"
                >
                  {(
                    [
                      ["all", "All"],
                      ["league", "Leagues"],
                      ["cup", "Cups"],
                      ["international", "International"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      className={competitionKind === kind ? "active" : ""}
                      aria-pressed={competitionKind === kind}
                      onClick={() => setCompetitionKind(kind)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
              <div className="directory-count" aria-live="polite">
                {visibleCompetitions.length} competitions to explore
              </div>
              <div className="competition-grid">
                {visibleCompetitions.map((competition) => (
                  <CompetitionCard
                    key={competition.id}
                    competition={competition}
                    href={`/?competition=${competition.id}`}
                  />
                ))}
              </div>
              {!visibleCompetitions.length && (
                <div className="empty-state">
                  <Search size={28} />
                  <h3>No competitions found</h3>
                  <p>Try a different name, country, or competition type.</p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setQuery("");
                      setCompetitionKind("all");
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              © {new Date(snapshot.generatedAt).getUTCFullYear()} Touchline
            </span>
            <span>
              Made for the love of football.{" "}
              <span className="footer-ball">✳</span>
            </span>
          </footer>
        </main>
        <aside className="right-rail" aria-label="Football highlights">
          <HomeHighlights
            snapshot={snapshot}
            onOpen={setSelectedMatch}
            onLive={() => {
              resetFilters();
              setStatus("live");
              document
                .getElementById("match-centre")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </aside>
      </div>
      {selectedMatch && (
        <MatchDialog
          match={selectedMatch}
          competition={snapshot.competitions.find(
            (competition) => competition.id === selectedMatch.competitionId,
          )!}
          timeZone={timeZone}
          saved={saved.ids.includes(selectedMatch.id)}
          onSave={() => saved.toggle(selectedMatch.id)}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
