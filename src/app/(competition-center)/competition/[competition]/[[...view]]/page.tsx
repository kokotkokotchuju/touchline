import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  competitionSlug,
  competitionHref,
  competitionQuerySchema,
  parseCompetitionPath,
} from "@/lib/football/competition-center";
import { getCompetitionPage } from "@/server/football/competition-service";
import { CompetitionView } from "@/components/football/competition-view";
import { StructuredData } from "@/components/seo/structured-data";

type Props = {
  params: Promise<{ competition: string; view?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function resolve({ params, searchParams }: Props) {
  const { competition, view } = await params;
  const path = parseCompetitionPath(view);
  const query = competitionQuerySchema.safeParse(await searchParams);
  if (
    !path ||
    !query.success ||
    !competitionSlug.safeParse(competition).success
  )
    notFound();
  const data = await getCompetitionPage(
    competition,
    path.season,
    path.section,
    query.data,
  );
  if (!data) notFound();
  return data;
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  await requireUser();
  const data = await resolve(props);
  return {
    title: `${data.competition.name}${data.season ? ` · ${data.season.name}` : ""} · ${data.section === "overview" ? "Overview" : data.section}`,
    description: `Tables, fixtures, results and statistics for ${data.competition.name}. Clearly labelled sample data.`,
    alternates: {
      canonical: competitionHref(
        data.competition.slug,
        data.section,
        data.season?.slug,
      ),
    },
    openGraph: {
      title: `${data.competition.name} | Touchline`,
      description: `Fixtures, tables and statistics for ${data.competition.name}.`,
      type: "website",
    },
    robots: { index: false, follow: true },
  };
}
export default async function CompetitionPage(props: Props) {
  await requireUser();
  const data = await resolve(props);
  const canonicalUrl = new URL(
    `/competition/${data.competition.slug}`,
    process.env.SITE_URL?.trim() || "http://localhost:3000",
  ).toString();
  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: data.competition.name,
          url: canonicalUrl,
          sport: "Football",
        }}
      />
      <CompetitionView data={data} />
    </>
  );
}
