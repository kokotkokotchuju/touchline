import { matchDetailResponse } from "@/server/football/match-center-api";
import { enforceApiRateLimit } from "@/server/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const rateLimit = await enforceApiRateLimit(request, "match-detail");
  if (!rateLimit.allowed) return rateLimit.response;
  return matchDetailResponse((await params).publicId);
}
