import { searchFootball, searchQuery } from "@/server/football/search-service";
import { enforceApiRateLimit } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await enforceApiRateLimit(request, "search");
  if (!rateLimit.allowed) return rateLimit.response;
  const params = new URL(request.url).searchParams;
  const parsed = searchQuery.safeParse(params.get("q") ?? "");
  if (
    !parsed.success ||
    parsed.data.length < 2 ||
    params.getAll("q").length > 1
  ) {
    return Response.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: "Supply one search query between 2 and 100 characters.",
        },
      },
      { status: 400, headers: rateLimit.headers },
    );
  }
  try {
    return Response.json(
      { data: await searchFootball(parsed.data) },
      { headers: rateLimit.headers },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "SEARCH_UNAVAILABLE",
          message: "Search is temporarily unavailable.",
        },
      },
      { status: 503, headers: rateLimit.headers },
    );
  }
}
