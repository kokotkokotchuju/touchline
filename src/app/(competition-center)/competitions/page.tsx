import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directoryQuerySchema } from "@/lib/football/competition-center";
import { getCompetitionDirectory } from "@/server/football/competition-service";
import { CompetitionDirectoryView } from "@/components/football/competition-directory";

export const metadata: Metadata = {
  title: "Competitions",
  description:
    "Discover football competitions, season tables, fixtures and statistics.",
  robots: { index: false, follow: false },
};
export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const parsed = directoryQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  return (
    <CompetitionDirectoryView
      data={await getCompetitionDirectory(parsed.data)}
      query={parsed.data}
    />
  );
}
