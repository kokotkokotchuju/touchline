import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ player: string }> };

export async function generateMetadata(): Promise<Metadata> {
  await requireUser();
  return {
    title: "Player coverage",
    description:
      "Player profiles will be available when the configured provider supplies verified player data.",
    robots: { index: false, follow: true },
  };
}

export default async function PlayerPage({ params }: Props) {
  await requireUser();
  const { player } = await params;
  return (
    <main className="page-shell">
      <Link href="/search" className="text-link">
        ← Search football
      </Link>
      <header className="page-heading">
        <p className="eyebrow">Player · {player}</p>
        <h1>Player data is not available yet</h1>
        <p>
          This provider integration currently supplies competitions, teams,
          fixtures and standings. No player profile or statistics are shown
          until verified provider data is synchronized.
        </p>
      </header>
    </main>
  );
}
