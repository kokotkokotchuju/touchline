import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { matchPublicId } from "@/lib/football/match-center";
import { getMatchCenterDetail } from "@/server/football/match-center-service";
import { MatchDetailView } from "@/components/football/match-center-detail";
import { StructuredData } from "@/components/seo/structured-data";

type Props = { params: Promise<{ match: string }> };
async function resolve(params: Props["params"]) {
  const segment = (await params).match;
  const publicId = matchPublicId(segment);
  if (!publicId) notFound();
  const detail = await getMatchCenterDetail(publicId);
  if (!detail) notFound();
  return { segment, detail };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireUser();
  const { detail } = await resolve(params);
  return {
    title: `${detail.match.home.name} vs ${detail.match.away.name}`,
    description: `Score, timeline, lineups and statistics for this sample ${detail.match.competition.name} fixture.`,
    alternates: { canonical: detail.match.href },
    openGraph: {
      title: `${detail.match.home.name} vs ${detail.match.away.name}`,
      description: `Match details, score and coverage for ${detail.match.competition.name}.`,
      type: "article",
      url: detail.match.href,
    },
    robots: { index: false, follow: true },
  };
}
export default async function MatchPage({ params }: Props) {
  await requireUser();
  const { segment, detail } = await resolve(params);
  if (`/match/${segment}` !== detail.match.href)
    permanentRedirect(detail.match.href);
  const eventStatus =
    detail.match.status === "scheduled"
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventCompleted";
  const canonicalUrl = new URL(
    detail.match.href,
    process.env.SITE_URL?.trim() || "http://localhost:3000",
  ).toString();
  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${detail.match.home.name} vs ${detail.match.away.name}`,
          startDate: detail.match.kickoff,
          eventStatus,
          sport: "Football",
          homeTeam: { "@type": "SportsTeam", name: detail.match.home.name },
          awayTeam: { "@type": "SportsTeam", name: detail.match.away.name },
          location: detail.match.venue
            ? { "@type": "Place", name: detail.match.venue }
            : undefined,
          url: canonicalUrl,
        }}
      />
      <MatchDetailView detail={detail} />
    </>
  );
}
