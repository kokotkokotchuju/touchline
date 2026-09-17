import { enforceApiRateLimit } from "@/server/http";
import { getStoredLiveMatches } from "@/server/football/live-read-service";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const limit = await enforceApiRateLimit(request, "live");
  if (!limit.allowed) return limit.response;
  try {
    return Response.json(await getStoredLiveMatches(), {
      headers: limit.headers,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "LIVE_UNAVAILABLE",
          message: "Stored live matches are temporarily unavailable.",
        },
      },
      { status: 503, headers: limit.headers },
    );
  }
}
