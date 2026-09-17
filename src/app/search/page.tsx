import { requireUser } from "@/server/require-user";
import Link from "next/link";
import { searchFootball, searchQuery } from "@/server/football/search-service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Search football",
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireUser();
  const parsed = searchQuery.safeParse((await searchParams).q);
  if (!parsed.success) notFound();
  const q = parsed.data;
  const results =
    q.trim().length >= 2
      ? await searchFootball(q)
      : { teams: [], players: [], competitions: [] };

  return (
    <main className="page-shell">
      <Link href="/" className="text-link">
        ← Match centre
      </Link>
      <header className="page-heading">
        <p className="eyebrow">Discovery</p>
        <h1>Search football</h1>
        <p>Find teams and competitions in the verified catalogue.</p>
      </header>
      <form className="search-form">
        <label htmlFor="football-search">Search</label>
        <input
          id="football-search"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder="Team or competition"
        />
        <button type="submit">Search</button>
      </form>
      <div className="search-results">
        <section className="content-card">
          <h2>Teams</h2>
          {results.teams.length ? (
            results.teams.map((team) => (
              <Link
                className="list-row"
                href={`/team/${team.id}`}
                key={team.id}
              >
                <strong>{team.name}</strong>
                <span>{team.shortName}</span>
              </Link>
            ))
          ) : (
            <p>No teams found.</p>
          )}
        </section>
        <section className="content-card">
          <h2>Players</h2>
          {results.players.length ? (
            results.players.map((player) => (
              <Link
                className="list-row"
                href={`/player/${player.slug}`}
                key={player.id}
              >
                <strong>{player.name}</strong>
                <span>{player.position ?? "Player"}</span>
              </Link>
            ))
          ) : (
            <p>No players found.</p>
          )}
        </section>
        <section className="content-card">
          <h2>Competitions</h2>
          {results.competitions.length ? (
            results.competitions.map((competition) => (
              <Link
                className="list-row"
                href={`/competition/${competition.slug}`}
                key={competition.id}
              >
                <strong>{competition.name}</strong>
                <span>{competition.region}</span>
              </Link>
            ))
          ) : (
            <p>No competitions found.</p>
          )}
        </section>
      </div>
    </main>
  );
}
