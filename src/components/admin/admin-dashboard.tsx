"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  RefreshCw,
  Server,
  Star,
  Zap,
} from "lucide-react";
import type { FootballSnapshot } from "@/lib/football/types";

type AdminState = {
  featuredCompetitions: string[];
  featuredMatches: string[];
  updatedAt: string | null;
};
type Infrastructure = {
  status: "ok" | "unavailable";
  database: string;
  redis: string;
};

export function AdminDashboard({
  snapshot,
  state: initialState,
  infrastructure,
}: {
  snapshot: FootballSnapshot;
  state: AdminState;
  infrastructure: Infrastructure;
}) {
  const [state, setState] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [operations, setOperations] = useState<{
    provider: { configured: boolean };
    records: { competitions: number; teams: number; matches: number };
    cache: {
      hits: number;
      misses: number;
      writes: number;
      redisUnavailable: number;
    };
  } | null>(null);
  const [operationMessage, setOperationMessage] = useState("");
  useEffect(() => {
    void fetch("/admin/operations")
      .then((response) => response.json())
      .then(setOperations);
  }, []);
  async function runOperation(action: "catalog-sync" | "live-sync") {
    setOperationMessage("Running…");
    const response = await fetch("/admin/operations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setOperationMessage(
      response.ok ? "Completed." : "Failed. Check server logs.",
    );
    if (response.ok)
      void fetch("/admin/operations")
        .then((result) => result.json())
        .then(setOperations);
  }
  async function save(next: AdminState) {
    setSaving(true);
    const response = await fetch("/admin/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) throw new Error("Unable to save admin state.");
    setState(await response.json());
    setSaving(false);
  }
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">TOUCHLINE CONTROL ROOM</span>
          <h1>Admin system</h1>
          <p>Operational controls are server-protected and never indexed.</p>
        </div>
        <span className="admin-protected">
          <Server size={15} /> Protected area
        </span>
      </header>
      <section className="admin-status-grid">
        <article className="admin-status-card">
          <Database size={18} />
          <span>Database</span>
          <strong
            className={
              infrastructure.database === "up" ? "status-up" : "status-down"
            }
          >
            {infrastructure.database}
          </strong>
        </article>
        <article className="admin-status-card">
          <Zap size={18} />
          <span>Redis cache</span>
          <strong
            className={
              infrastructure.redis === "up" ? "status-up" : "status-down"
            }
          >
            {infrastructure.redis}
          </strong>
        </article>
        <article className="admin-status-card">
          <Activity size={18} />
          <span>Sync source</span>
          <strong>
            {snapshot.source === "provider" ? "Provider" : "Development"}
          </strong>
        </article>
        <article className="admin-status-card">
          <Gauge size={18} />
          <span>Snapshot cache</span>
          <strong>15 seconds</strong>
        </article>
      </section>
      <div className="admin-grid">
        <section className="admin-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">SYNCHRONIZATION</span>
              <h2>API synchronization status</h2>
            </div>
            <RefreshCw size={18} />
          </div>
          <div className="admin-list-row">
            <span>Last snapshot read</span>
            <strong>{new Date(snapshot.generatedAt).toLocaleString()}</strong>
          </div>
          <div className="admin-list-row">
            <span>Provider key</span>
            <strong>
              {operations?.provider.configured ? "Configured" : "Missing"}
            </strong>
          </div>
          <div className="admin-list-row">
            <span>Stored matches</span>
            <strong>{operations?.records.matches ?? "—"}</strong>
          </div>
          <button
            className="secondary-button"
            onClick={() => void runOperation("catalog-sync")}
          >
            Run catalog sync
          </button>
          <button
            className="secondary-button"
            onClick={() => void runOperation("live-sync")}
          >
            Run live sync
          </button>
          <p className="admin-note">
            <AlertTriangle size={14} />{" "}
            {operationMessage || "Operations are protected by the admin route."}
          </p>
        </section>
        <section className="admin-card">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">PROVIDER USAGE</span>
              <h2>API usage</h2>
            </div>
            <Activity size={18} />
          </div>
          <div className="usage-number">—</div>
          <p>
            Usage quotas become available when a production provider is
            configured.
          </p>
          <div className="admin-list-row">
            <span>Requests today</span>
            <strong>Not configured</strong>
          </div>
          <div className="admin-list-row">
            <span>Rate limit</span>
            <strong>Not configured</strong>
          </div>
        </section>
        <section className="admin-card admin-wide">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">EDITORIAL CONTROLS</span>
              <h2>Featured competitions</h2>
            </div>
            <Star size={18} />
          </div>
          <div className="admin-options">
            {snapshot.competitions.map((competition) => (
              <label key={competition.id}>
                <input
                  type="checkbox"
                  checked={state.featuredCompetitions.includes(competition.id)}
                  onChange={() => {
                    const featuredCompetitions =
                      state.featuredCompetitions.includes(competition.id)
                        ? state.featuredCompetitions.filter(
                            (id) => id !== competition.id,
                          )
                        : [...state.featuredCompetitions, competition.id];
                    void save({ ...state, featuredCompetitions });
                  }}
                />
                {competition.name}
              </label>
            ))}
          </div>
          <small>
            {saving
              ? "Saving…"
              : state.updatedAt
                ? `Saved ${new Date(state.updatedAt).toLocaleString()}`
                : "No featured competitions selected."}
          </small>
        </section>
        <section className="admin-card admin-wide">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">EDITORIAL CONTROLS</span>
              <h2>Featured matches</h2>
            </div>
            <Star size={18} />
          </div>
          <div className="admin-options">
            {snapshot.matches
              .filter((match) => match.status === "scheduled")
              .slice(0, 12)
              .map((match) => (
                <label key={match.id}>
                  <input
                    type="checkbox"
                    checked={state.featuredMatches.includes(match.id)}
                    onChange={() => {
                      const featuredMatches = state.featuredMatches.includes(
                        match.id,
                      )
                        ? state.featuredMatches.filter((id) => id !== match.id)
                        : [...state.featuredMatches, match.id];
                      void save({ ...state, featuredMatches });
                    }}
                  />
                  {match.home.name} vs {match.away.name}
                </label>
              ))}
          </div>
          <small>
            {saving
              ? "Saving…"
              : state.updatedAt
                ? `Saved ${new Date(state.updatedAt).toLocaleString()}`
                : "No featured matches selected."}
          </small>
        </section>
        <section className="admin-card admin-wide">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">CACHE INSPECTION</span>
              <h2>Cache status</h2>
            </div>
            <Database size={18} />
          </div>
          <div className="admin-cache-grid">
            <div>
              <strong>Hits</strong>
              <span>{operations?.cache.hits ?? "—"}</span>
            </div>
            <div>
              <strong>Misses</strong>
              <span>{operations?.cache.misses ?? "—"}</span>
            </div>
            <div>
              <strong>Writes</strong>
              <span>{operations?.cache.writes ?? "—"}</span>
            </div>
            <div>
              <strong>Redis failures</strong>
              <span>{operations?.cache.redisUnavailable ?? "—"}</span>
            </div>
          </div>
          <p className="admin-note">
            Match and snapshot reads use short TTLs; historical data can use
            longer TTLs. Failed loads are never cached.
          </p>
        </section>
        <section className="admin-card admin-wide">
          <div className="admin-card-heading">
            <div>
              <span className="admin-kicker">DATA QUALITY</span>
              <h2>Data problems</h2>
            </div>
            <AlertTriangle size={18} />
          </div>
          <div className="admin-list-row">
            <span>Open data problems</span>
            <strong>0</strong>
          </div>
          <p className="admin-note">
            No provider-backed validation queue exists in this preview.
            Synthetic records remain labelled as development data.
          </p>
        </section>
      </div>
    </main>
  );
}
