import { enforcePublicApiRateLimit } from "@/server/http";
import { getFootballNews } from "@/server/football/news";

export async function GET(request: Request) {
  const limit = await enforcePublicApiRateLimit(request, "football-news");
  if (!limit.allowed) return limit.response;
  try {
    return Response.json(await getFootballNews(), { headers: limit.headers });
  } catch {
    return Response.json(
      {
        error:
          "Football news is temporarily unavailable. Please try again later.",
      },
      { status: 503, headers: limit.headers },
    );
  }
}
