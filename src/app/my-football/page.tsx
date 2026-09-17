import { requireUser } from "@/server/require-user";
import type { Metadata } from "next";
import { AccountCenter } from "@/components/football/account-center";
import { getFootballSnapshot } from "@/server/football/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Football",
  robots: { index: false, follow: false },
};

export default async function MyFootballPage() {
  await requireUser();
  return <AccountCenter snapshot={await getFootballSnapshot()} />;
}
