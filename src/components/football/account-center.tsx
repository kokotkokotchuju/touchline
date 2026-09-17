"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Heart,
  LogIn,
  LogOut,
  Settings2,
  Star,
  UserRound,
} from "lucide-react";
import type { FootballSnapshot } from "@/lib/football/types";
import { CompetitionMark, TeamBadge } from "./marks";
import { MatchCard } from "./cards";

type Preferences = {
  matchStarting: boolean;
  goal: boolean;
  halftime: boolean;
  fullTime: boolean;
  lineups: boolean;
};

const preferenceLabels: Array<[keyof Preferences, string, string]> = [
  [
    "matchStarting",
    "Match starting",
    "A reminder before a followed match begins",
  ],
  ["goal", "Goal", "Instant updates when the score changes"],
  ["halftime", "Halftime", "The score at the interval"],
  ["fullTime", "Full time", "The final whistle and result"],
  ["lineups", "Lineups available", "When team lineups are confirmed"],
];
const defaultPreferences: Preferences = {
  matchStarting: true,
  goal: true,
  halftime: false,
  fullTime: true,
  lineups: true,
};

export function AccountCenter({ snapshot }: { snapshot: FootballSnapshot }) {
  const router = useRouter();
  const teams = useMemo(
    () =>
      Array.from(
        new Map(
          snapshot.matches.flatMap((match) => [
            [match.home.id, match.home],
            [match.away.id, match.away],
          ]),
        ).values(),
      ),
    [snapshot.matches],
  );
  const upcoming = snapshot.matches
    .filter((match) => match.status === "scheduled")
    .slice(0, 3);
  const recent = snapshot.matches
    .filter((match) => match.status === "finished")
    .slice(0, 3);
  const [signedIn, setSignedIn] = useState(true);
  const [email, setEmail] = useState("");
  const [favorites, setFavorites] = useState({
    competitions: [] as string[],
    teams: [] as string[],
    players: [] as string[],
  });
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      void fetch("/api/auth")
        .then((response) => response.json())
        .then((session: { email?: string }) => {
          if (!session.email) return;
          setEmail(session.email);
          setSignedIn(true);
          return fetch("/api/account").then((response) =>
            response.ok ? response.json() : null,
          );
        })
        .then(
          (
            account:
              | { favorites: typeof favorites; preferences: Preferences }
              | null
              | undefined,
          ) => {
            if (!account) return;
            setFavorites(account.favorites);
            setPreferences(account.preferences);
          },
        );
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);
  function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    const password = window.prompt(
      "Create or enter your password (12+ characters).",
    );
    if (!password) return;
    void fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Authentication failed");
        return response.json();
      })
      .then((session: { email: string }) => {
        setEmail(session.email);
        setSignedIn(true);
        return fetch("/api/account", { cache: "no-store" });
      })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load account");
        return response.json();
      })
      .then(
        (account: {
          favorites: typeof favorites;
          preferences: Preferences;
        }) => {
          setFavorites(account.favorites);
          setPreferences(account.preferences);
        },
      )
      .catch(() =>
        window.alert("Unable to sign in. Check your email and password."),
      );
  }
  async function updateFavorites(next: typeof favorites) {
    if (!signedIn) {
      window.alert("Sign in before following teams or competitions.");
      return;
    }
    const previous = favorites;
    setFavorites(next);
    try {
      const response = await saveAccount(next, preferences);
      if (!response.ok) throw new Error("Unable to save favorites");
    } catch {
      setFavorites(previous);
      window.alert("Unable to save favorites. Please try again.");
    }
  }
  function togglePreference(key: keyof Preferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    void saveAccount(favorites, next).then((response) => {
      if (!response.ok) setPreferences(preferences);
    });
  }
  function saveAccount(
    nextFavorites: typeof favorites,
    nextPreferences: Preferences,
  ) {
    return fetch("/api/account", {
      method: "PUT",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        favorites: nextFavorites,
        preferences: nextPreferences,
      }),
    });
  }
  const favoriteCompetitions = snapshot.competitions.filter((entry) =>
    favorites.competitions.includes(entry.id),
  );
  const favoriteTeams = teams.filter((entry) =>
    favorites.teams.includes(entry.id),
  );

  return (
    <div className="app-root account-page">
      <header className="simple-page-header">
        <div className="page-shell">
          <Link href="/" className="back-link">
            ← Back to football
          </Link>
          <span className="page-kicker">PERSONALISED FOOTBALL</span>
          <h1>My Football</h1>
          <p>Keep the clubs, players and competitions you care about close.</p>
        </div>
      </header>
      <main className="page-shell account-shell">
        {!signedIn ? (
          <section className="account-signin" aria-labelledby="signin-title">
            <div className="account-icon">
              <UserRound size={26} />
            </div>
            <div>
              <div className="section-kicker">YOUR FOOTBALL, YOUR WAY</div>
              <h2 id="signin-title">Sign in to save your game</h2>
              <p>
                Follow teams, players and competitions, then get only the
                updates you want.
              </p>
            </div>
            <form onSubmit={signIn} className="signin-form">
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                <LogIn size={16} /> Continue with email
              </button>
              <small>Use a strong password of at least 12 characters.</small>
            </form>
          </section>
        ) : (
          <section className="account-welcome">
            <div>
              <span className="account-icon">
                <Check size={24} />
              </span>
              <div>
                <div className="section-kicker">WELCOME BACK</div>
                <h2>{email || "Your football dashboard"}</h2>
                <p>Your follows and notification preferences are ready.</p>
              </div>
            </div>
            <button
              className="secondary-button"
              onClick={() => {
                void fetch("/api/auth", { method: "DELETE" }).then(
                  (response) => {
                    if (response.ok) {
                      router.replace("/");
                      router.refresh();
                    }
                  },
                );
              }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </section>
        )}
        <div className="account-grid">
          <section className="account-main">
            <div className="content-heading">
              <div>
                <div className="section-kicker">YOUR RADAR</div>
                <h2>Upcoming matches</h2>
              </div>
              <Bell size={19} />
            </div>
            <div className="account-match-grid">
              {upcoming.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  competition={
                    snapshot.competitions.find(
                      (entry) => entry.id === match.competitionId,
                    )?.shortName ?? "Football"
                  }
                  sample={snapshot.source === "demo"}
                />
              ))}
            </div>
            <div className="content-heading account-section-heading">
              <div>
                <div className="section-kicker">THE WHISTLE HAS GONE</div>
                <h2>Recent results</h2>
              </div>
            </div>
            <div className="account-match-grid">
              {recent.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  competition={
                    snapshot.competitions.find(
                      (entry) => entry.id === match.competitionId,
                    )?.shortName ?? "Football"
                  }
                />
              ))}
            </div>
            <div className="content-heading account-section-heading">
              <div>
                <div className="section-kicker">FOLLOWING</div>
                <h2>Favorite competitions</h2>
              </div>
              <Heart size={19} />
            </div>
            <div className="favorite-list">
              {favoriteCompetitions.map((competition) => (
                <div className="favorite-row" key={competition.id}>
                  <CompetitionMark competition={competition} />
                  <strong>{competition.name}</strong>
                  <button
                    aria-label={`Unfollow ${competition.name}`}
                    onClick={() =>
                      updateFavorites({
                        ...favorites,
                        competitions: favorites.competitions.filter(
                          (id) => id !== competition.id,
                        ),
                      })
                    }
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </section>
          <aside className="account-side">
            <section className="panel-card">
              <div className="panel-heading">
                <h2>Follow the game</h2>
                <Heart size={17} />
              </div>
              <p>Choose what you want to see in your radar.</p>
              <div className="follow-picks">
                {teams.slice(0, 4).map((team) => (
                  <button
                    key={team.id}
                    className={
                      favorites.teams.includes(team.id)
                        ? "follow-pick followed"
                        : "follow-pick"
                    }
                    onClick={() =>
                      updateFavorites({
                        ...favorites,
                        teams: favorites.teams.includes(team.id)
                          ? favorites.teams.filter((id) => id !== team.id)
                          : [...favorites.teams, team.id],
                      })
                    }
                  >
                    <TeamBadge team={team} />
                    <span>{team.name}</span>
                    <span className="follow-mark">
                      {favorites.teams.includes(team.id)
                        ? "Following"
                        : "Follow"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel-card">
              <div className="panel-heading">
                <h2>Favorite teams</h2>
                <ChevronRight size={16} />
              </div>
              {favoriteTeams.length ? (
                favoriteTeams.map((team) => (
                  <div className="compact-favorite" key={team.id}>
                    <TeamBadge team={team} />
                    <strong>{team.name}</strong>
                    <span>Following</span>
                  </div>
                ))
              ) : (
                <p>No favorite teams yet.</p>
              )}
            </section>
            <section className="panel-card">
              <div className="panel-heading">
                <h2>Favorite players</h2>
                <ChevronRight size={16} />
              </div>
              {favorites.players.length ? (
                <p>
                  Player profiles will appear here when player data is available
                  from the provider.
                </p>
              ) : (
                <p>No favorite players yet.</p>
              )}
            </section>
            <section className="panel-card">
              <div className="panel-heading">
                <h2>Notification preferences</h2>
                <Settings2 size={17} />
              </div>
              <p>Fine-tune your matchday alerts.</p>
              <div className="preference-list">
                {preferenceLabels.map(([key, label, description]) => (
                  <label className="preference-row" key={key}>
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={() => togglePreference(key)}
                    />
                  </label>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
