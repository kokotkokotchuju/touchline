import { redirect } from "next/navigation";
import { FootballApp } from "@/components/football/football-app";
import { getCurrentUser } from "@/server/auth";
import { getFootballSnapshot } from "@/server/football/service";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; saved?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  const [snapshot, params] = await Promise.all([
    getFootballSnapshot(),
    searchParams,
  ]);
  const competition = snapshot.competitions.some(
    (entry) => entry.id === params.competition,
  )
    ? params.competition
    : "";
  return (
    <FootballApp
      key={`${competition}-${params.saved}`}
      snapshot={snapshot}
      initialCompetition={competition}
      initialSaved={params.saved === "1"}
    />
  );
}
