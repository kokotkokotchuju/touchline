import { redirect } from "next/navigation";

export default async function DatedMatchesPage({
  params: _params,
  searchParams: _searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  void _params;
  void _searchParams;
  redirect("/");
}
