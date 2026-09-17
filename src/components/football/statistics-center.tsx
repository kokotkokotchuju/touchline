"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  Info,
  Trophy,
} from "lucide-react";
import type { FootballSnapshot } from "@/lib/football/types";

const leaderboardOptions = [
  ["goals", "Top scorers"],
  ["assists", "Assists"],
  ["yellow_cards", "Cards"],
  ["red_cards", "Red cards"],
  ["clean_sheets", "Clean sheets"],
  ["minutes", "Minutes"],
  ["shots", "Shots"],
  ["shots_on_target", "Shots on target"],
] as const;
type LeaderboardKey = (typeof leaderboardOptions)[number][0];
type LeaderboardData = {
  status: "available" | "unavailable";
  provider: string | null;
  rows: Array<{ player: string; team: string; value: number }>;
  reason?: string;
};

export function StatisticsCenter({ snapshot }: { snapshot: FootballSnapshot }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardKey>("goals");
  const [competition, setCompetition] = useState(
    snapshot.competitions[0]?.id ?? "",
  );
  const [tab, setTab] = useState<"leaderboards" | "comparison" | "form">(
    "leaderboards",
  );
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    if (!competition) return;
    const controller = new AbortController();
    void fetch(
      `/api/v1/statistics?competition=${encodeURIComponent(competition)}&category=${leaderboard}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((payload: { data?: LeaderboardData }) =>
        setData(payload.data ?? null),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setData(null);
      });
    return () => controller.abort();
  }, [competition, leaderboard]);

  return (
    <div className="app-root statistics-page">
      <header className="simple-page-header">
        <div className="page-shell">
          <Link href="/" className="back-link">
            ← Back to football
          </Link>
          <span className="page-kicker">THE NUMBERS BEHIND THE GAME</span>
          <h1>Statistics centre</h1>
          <p>
            Explore provider-backed numbers without filling gaps with estimates.
          </p>
        </div>
      </header>
      <main className="page-shell stats-shell">
        <nav className="stats-tabs" aria-label="Statistics sections">
          <button
            className={tab === "leaderboards" ? "active" : ""}
            onClick={() => setTab("leaderboards")}
          >
            <Trophy size={16} /> Leaderboards
          </button>
          <button
            className={tab === "comparison" ? "active" : ""}
            onClick={() => setTab("comparison")}
          >
            <ArrowLeftRight size={16} /> Compare
          </button>
          <button
            className={tab === "form" ? "active" : ""}
            onClick={() => setTab("form")}
          >
            <BarChart3 size={16} /> Form explorer
          </button>
        </nav>
        {tab === "leaderboards" && (
          <section className="stats-card">
            <div className="stats-card-header">
              <div>
                <div className="section-kicker">PROVIDER LEADERBOARDS</div>
                <h2>Who is leading the way?</h2>
              </div>
              <label className="stats-select">
                Competition
                <select
                  value={competition}
                  onChange={(event) => setCompetition(event.target.value)}
                >
                  {snapshot.competitions.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </label>
            </div>
            <div className="leaderboard-pills">
              {leaderboardOptions.map(([key, label]) => (
                <button
                  className={leaderboard === key ? "active" : ""}
                  key={key}
                  onClick={() => setLeaderboard(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {data?.status === "available" ? (
              <>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, index) => (
                      <tr key={`${row.player}-${row.team}`}>
                        <td>{index + 1}</td>
                        <th>{row.player}</th>
                        <td>{row.team}</td>
                        <td>
                          <strong>{row.value}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="provider-note">
                  <Info size={15} /> Source: {data.provider}. Values are
                  synchronized from the selected competition and season.
                </p>
              </>
            ) : (
              <div className="discovery-empty">
                <Info size={25} />
                <strong>
                  {data?.reason ?? "Loading verified provider data."}
                </strong>
                <span>
                  Unsupported metrics are not replaced with estimates.
                </span>
              </div>
            )}
          </section>
        )}
        {tab === "comparison" && (
          <section className="stats-card comparison-card">
            <div className="section-kicker">COMPARISON TOOLS</div>
            <h2>Team vs Team · Player vs Player</h2>
            <p>
              Comparison requires provider-backed team and player statistics for
              both selected entities.
            </p>
            <div className="discovery-empty">
              <Info size={25} />
              <strong>Comparison data is not available yet</strong>
              <span>
                The selected provider does not currently expose the required
                player and team statistics.
              </span>
            </div>
          </section>
        )}
        {tab === "form" && (
          <section className="stats-card form-explorer">
            <div className="section-kicker">CUSTOM TABLE</div>
            <h2>Form explorer</h2>
            <p>
              Calculated standings will appear when synchronized standings and
              match history cover the selected criteria.
            </p>
            <div className="discovery-empty">
              <Info size={25} />
              <strong>Verified form data is not available yet</strong>
              <span>
                No calculated table is shown until the provider supplies enough
                matches for this selection.
              </span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
