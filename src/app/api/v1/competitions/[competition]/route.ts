import { competitionPageResponse } from "@/server/football/competition-api";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ competition: string }> },
) {
  return competitionPageResponse(request, (await params).competition);
}
