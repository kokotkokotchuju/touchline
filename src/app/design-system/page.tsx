import { requireUser } from "@/server/require-user";
import { notFound } from "next/navigation";
import { getFootballSnapshot } from "@/server/football/service";
import { DesignSystemPreview } from "@/components/design-system-preview";

export default async function DesignSystemPage() {
  await requireUser();
  if (process.env.NODE_ENV !== "development") notFound();
  return <DesignSystemPreview snapshot={await getFootballSnapshot()} />;
}
