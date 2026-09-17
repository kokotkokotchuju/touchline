"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Globe2,
  Info,
  Radio,
  Trophy,
} from "lucide-react";
import type { FootballSnapshot } from "@/lib/football/types";
import { formatKickoff } from "@/lib/football/filters";
import { CompetitionMark, TeamBadge } from "./marks";

export function DiscoveryView({ snapshot }: { snapshot: FootballSnapshot }) {
  const [champions, setChampions] = useState<Array<{
    season: string;
    team: string;
  }> | null>(null);
  const live = snapshot.matches.filter((match) => match.status === "live");
  const upcoming = snapshot.matches
    .filter((match) => match.status === "scheduled")
    .sort(
      (a, b) =>
        Number(a.competitionId !== "champions-league") -
        Number(b.competitionId !== "champions-league"),
    )
    .slice(0, 6);
  const competition = (id: string) =>
    snapshot.competitions.find((entry) => entry.id === id);
  useEffect(() => {
    const slug = snapshot.competitions[0]?.id;
    if (!slug) return;
    void fetch(`/api/v1/history?competition=${encodeURIComponent(slug)}`)
      .then((response) => response.json())
      .then(
        (payload: {
          data?: { rows?: Array<{ season: string; team: string }> };
        }) => setChampions(payload.data?.rows ?? []),
      )
      .catch(() => setChampions([]));
  }, [snapshot.competitions]);

  return (
    <div className="app-root discovery-page">
      <header className="simple-page-header">
        <div className="page-shell">
          <Link href="/" className="back-link">
            ← Back to football
          </Link>
          <span className="page-kicker">FOOTBALL DISCOVERY</span>
          <h1>What’s happening in football?</h1>
          <p>
            Find matches in motion, upcoming moments and the stories worth
            exploring.
          </p>
        </div>
      </header>
      <main className="page-shell discovery-shell">
        <div className="discovery-notice">
          <Info size={15} /> This preview uses illustrative data. Live coverage
          and historical records appear only when a verified provider supplies
          them.
        </div>
        <section className="discovery-section">
          <div className="content-heading">
            <div>
              <div className="section-kicker">AROUND THE WORLD, RIGHT NOW</div>
              <h2>Football Right Now</h2>
            </div>
            <Radio size={20} />
          </div>
          {live.length ? (
            <div className="discovery-match-grid">
              {live.map((match) => (
                <article className="discovery-match" key={match.id}>
                  <div className="discovery-match-meta">
                    <span className="live-dot" /> Live now · {match.minute}′
                  </div>
                  <div className="discovery-teams">
                    <div>
                      <TeamBadge team={match.home} large />
                      <strong>{match.home.name}</strong>
                    </div>
                    <strong className="discovery-score">
                      {match.homeScore}:{match.awayScore}
                    </strong>
                    <div>
                      <TeamBadge team={match.away} large />
                      <strong>{match.away.name}</strong>
                    </div>
                  </div>
                  <span className="discovery-competition">
                    {competition(match.competitionId)?.name}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="discovery-empty">
              <Globe2 size={25} />
              <strong>No matches are currently marked live</strong>
              <span>Check the match centre for the next kick-offs.</span>
              <Link href="/">
                Open match centre <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
        <section className="discovery-section">
          <div className="content-heading">
            <div>
              <div className="section-kicker">
                SELECTED BY COMPETITION IMPORTANCE
              </div>
              <h2>Big Matches</h2>
            </div>
            <Trophy size={20} />
          </div>
          <p className="discovery-intro">
            Upcoming fixtures are prioritised from available competition and
            stage signals. Rivalry, rankings and venue data are not available in
            this preview.
          </p>
          <div className="discovery-upcoming">
            {upcoming.map((match) => (
              <article className="upcoming-row" key={match.id}>
                <div className="upcoming-time">
                  <CalendarDays size={15} />
                  <strong>
                    {new Date(match.kickoff).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </strong>
                  <span>
                    <Clock3 size={12} />{" "}
                    {formatKickoff(match.kickoff, "Europe/Bratislava")} Europe/Bratislava
                  </span>
                </div>
                <div className="upcoming-teams">
                  <strong>{match.home.name}</strong>
                  <span>vs</span>
                  <strong>{match.away.name}</strong>
                </div>
                <div className="upcoming-comp">
                  <CompetitionMark
                    competition={competition(match.competitionId)!}
                  />
                  {competition(match.competitionId)?.shortName}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="discovery-section historical-section">
          <div className="content-heading">
            <div>
              <div className="section-kicker">HISTORY, WHEN VERIFIED</div>
              <h2>Historical pages</h2>
            </div>
            <Clock3 size={20} />
          </div>
          <div className="historical-grid">
            <article>
              <h3>Previous champions</h3>
              {champions?.length ? (
                <ol>
                  {champions.map((row) => (
                    <li key={row.season}>
                      <strong>{row.season}</strong>
                      <span>{row.team}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  Not available yet — no verified provider history is
                  synchronized.
                </p>
              )}
            </article>
            {[
              "Club trophies",
              "All-time tables",
              "Record scorers",
              "Biggest victories",
              "Unbeaten runs",
            ].map((label) => (
              <article key={label}>
                <h3>{label}</h3>
                <p>
                  Not available yet — this view requires a verified historical
                  dataset.
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
