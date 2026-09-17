import { z } from "zod";
import { enforceApiRateLimit } from "@/server/http";
import { getPreviousChampions } from "@/server/football/history-service";
import { reportServerError } from "@/server/monitoring";

const querySchema = z.object({
  competition: z.string().trim().min(1).max(100),
});

export async function GET(request: Request) {
  const rateLimit = await enforceApiRateLimit(request, "history");
  if (!rateLimit.allowed) return rateLimit.response;
  const parsed = querySchema.safeParse({
    competition: new URL(request.url).searchParams.get("competition"),
  });
  if (!parsed.success)
    return Response.json(
      { error: "competition is required." },
      { status: 400, headers: rateLimit.headers },
    );
  try {
    const headers = new Headers(rateLimit.headers);
    headers.set("Cache-Control", "private, max-age=3600");
    return Response.json(
      { data: await getPreviousChampions(parsed.data.competition) },
      {
        headers,
      },
    );
  } catch (error) {
    await reportServerError(error, {
      operation: "history",
      route: "/api/v1/history",
    });
    return Response.json(
      {
        data: {
          status: "unavailable",
          provider: null,
          rows: [],
          reason: "Verified historical data is temporarily unavailable.",
        },
      },
      { headers: rateLimit.headers },
    );
  }
}
