import type { Metadata } from "next";
import { requireUser } from "@/server/require-user";
import { SiteHeader } from "@/components/layout/site-header";
import { NewsPage } from "@/components/football/news-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Football news",
  description: "The latest football headlines and stories.",
  robots: { index: false, follow: true },
};

export default async function NewsRoute() {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <NewsPage />
    </>
  );
}
