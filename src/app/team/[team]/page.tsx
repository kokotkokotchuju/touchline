import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getTeamSummary } from "@/server/football/team-read-service";
import {
  MatchCenterRow,
  MatchCenterShell,
  SampleNotice,
} from "@/components/football/match-center-shared";
import { DataBadge } from "@/components/football/data-badge";
import { EmptyState } from "@/components/ui/states";

type Props = { params: Promise<{ team: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireUser();
  const data = await getTeamSummary((await params).team);
  if (!data) notFound();
  return {
    title: `${data.team.name} fixtures`,
    description: `Stored fixtures and results for ${data.team.name}.`,
    robots: { index: false, follow: false },
    alternates: { canonical: `/team/${data.team.slug}` },
  };
}
export default async function TeamPage({ params }: Props) {
  await requireUser();
  const segment = (await params).team;
  const data = await getTeamSummary(segment);
  if (!data) notFound();
  if (segment !== data.team.slug) permanentRedirect(`/team/${data.team.slug}`);
  return (
    <MatchCenterShell>
      <Link href="/search" className="cc-back">
        ← Search football
      </Link>
      <header className="mc-page-heading">
        <div>
          <DataBadge team={data.team} large />
          <h1>{data.team.name}</h1>
          <p>
            {data.country ?? "Country unavailable"} · Available fixtures and
            results
          </p>
        </div>
      </header>
      {data.sample && <SampleNotice />}
      <section className="cc-panel">
        <div className="cc-section-heading">
          <h2>Fixtures and results</h2>
          <span className="cc-muted">Kickoff times in UTC</span>
        </div>
        {data.matches.length ? (
          data.matches.map((match) => (
            <MatchCenterRow key={match.id} match={match} showDate />
          ))
        ) : (
          <EmptyState
            title="No stored fixtures"
            description="No matches have been supplied for this team yet."
          />
        )}
      </section>
      {data.truncated && (
        <p className="cc-muted">
          Showing the 40 most recently dated stored fixtures.
        </p>
      )}
    </MatchCenterShell>
  );
}
