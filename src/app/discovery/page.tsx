import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { getFootballSnapshot } from "@/server/football/service";
import { DiscoveryView } from "@/components/football/discovery-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Football discovery",
  description:
    "See football happening now, notable upcoming fixtures and available historical records.",
  alternates: { canonical: "/discovery" },
  openGraph: {
    title: "Football discovery | Touchline",
    description:
      "See football happening now and discover notable upcoming fixtures.",
    type: "website",
    url: "/discovery",
  },
  robots: { index: false, follow: true },
};

export default async function DiscoveryPage() {
  await requireUser();
  return <DiscoveryView snapshot={await getFootballSnapshot()} />;
}
