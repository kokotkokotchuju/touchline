import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { StatisticsCenter } from "@/components/football/statistics-center";
import { getFootballSnapshot } from "@/server/football/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Statistics centre",
  robots: { index: false, follow: false },
};

export default async function StatisticsPage() {
  await requireUser();
  return <StatisticsCenter snapshot={await getFootballSnapshot()} />;
}
