"use client";
import Link from "next/link";
import { NewsCard } from "./news-card";
import { useEffect, useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import type { FootballSnapshot, FootballMatch } from "@/lib/football/types";
import type { CompetitionPageData } from "@/lib/football/competition-center";
import { TeamBadge } from "./marks";

type LeagueOption = {
  slug: string;
  name: string;
};

export function HomeHighlights({
  snapshot,
  onOpen,
  onLive,
}: {
  snapshot: FootballSnapshot;
  onOpen: (match: FootballMatch) => void;
  onLive: () => void;
}) {
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [league, setLeague] = useState("");
  const [table, setTable] = useState<CompetitionPageData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/competitions?kind=league&page=1", {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        const options = (result?.data ?? []).map(
          (competition: { slug: string; name: string }) => ({
            slug: competition.slug,
            name: competition.name,
          }),
        );
        const visibleLeagues = options.filter(
          (option: LeagueOption) =>
            !/super\s*league|superliga/i.test(option.name),
        );
        setLeagues(visibleLeagues);
        if (visibleLeagues.length) {
          setLoading(true);
          setLeague((current) => current || visibleLeagues[0].slug);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLeagues([]);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!league) return;
    const controller = new AbortController();
    void fetch(`/api/v1/competitions/${league}?section=standings`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        setTable(result?.data ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTable(null);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [league]);
  const live = snapshot.matches.filter((m) => m.status === "live");

  return (
    <>
      <section className="home-rail-card">
        <div className="home-rail-title">
          <h2>
            <span className="live-dot" /> Live now
          </h2>
          <span>{live.length} matches</span>
          <button onClick={onLive}>
            View all <ArrowRight size={13} />
          </button>
        </div>
        {live.slice(0, 3).map((m) => (
          <button
            key={m.id}
            className="home-live-row"
            onClick={() => onOpen(m)}
          >
            <span className="home-minute">
              {m.minute ?? "Live"}
              {m.minute !== null ? "′" : ""}
            </span>
            <span className="home-live-teams">
              <span>
                <TeamBadge team={m.home} />
                {m.home.shortName}
                <strong>
                  {m.homeScore} - {m.awayScore}
                </strong>
                <TeamBadge team={m.away} />
                {m.away.shortName}
              </span>
              <small>
                {
                  snapshot.competitions.find((c) => c.id === m.competitionId)
                    ?.name
                }
              </small>
            </span>
          </button>
        ))}
        {!live.length && (
          <p className="home-rail-empty">
            No live matches right now. Check upcoming fixtures for the next
            kick-off.
          </p>
        )}
      </section>
      <section className="home-rail-card">
        <div className="home-rail-title">
          <h2>
            <Trophy size={20} /> League tables
          </h2>
          <Link href={`/competition/${league}/standings`}>
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="home-league-tabs" aria-label="League table">
          {leagues.map((l) => (
            <button
              key={l.slug}
              aria-pressed={league === l.slug}
              onClick={() => {
                if (l.slug !== league) {
                  setLoading(true);
                  setTable(null);
                  setLeague(l.slug);
                }
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
        {!leagues.length && !loading ? (
          <p className="home-rail-empty">
            League tables are not available yet.
          </p>
        ) : loading ? (
          <p className="home-rail-empty" role="status">
            Loading standings…
          </p>
        ) : table?.tables[0]?.rows.length ? (
          <>
            <table className="home-standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.tables[0].rows.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>{row.position ?? "—"}</td>
                    <td>{row.team.name}</td>
                    <td>{row.played ?? "—"}</td>
                    <td>{row.goalDifference ?? "—"}</td>
                    <td>
                      <strong>{row.points ?? "—"}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="home-source">
              {table.season?.name} · Development data
            </p>
          </>
        ) : (
          <p className="home-rail-empty">
            Standings are not available for this league yet.
          </p>
        )}
      </section>
      <NewsCard />
    </>
  );
}
