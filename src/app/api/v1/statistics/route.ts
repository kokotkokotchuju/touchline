import { z } from "zod";
import { enforceApiRateLimit } from "@/server/http";
import { getProviderLeaderboard } from "@/server/football/statistics-service";
import { reportServerError } from "@/server/monitoring";

const querySchema = z.object({
  competition: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(40),
  season: z.string().trim().max(20).optional(),
});

export async function GET(request: Request) {
  const rateLimit = await enforceApiRateLimit(request, "statistics");
  if (!rateLimit.allowed) return rateLimit.response;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(query);
  if (!parsed.success)
    return Response.json(
      { error: "competition and category are required." },
      { status: 400, headers: rateLimit.headers },
    );
  let data;
  try {
    data = await getProviderLeaderboard(
      parsed.data.competition,
      parsed.data.category,
      parsed.data.season,
    );
  } catch (error) {
    await reportServerError(error, {
      operation: "statistics",
      route: "/api/v1/statistics",
    });
    return Response.json(
      { error: "Statistics are temporarily unavailable." },
      { status: 503, headers: rateLimit.headers },
    );
  }
  const headers = new Headers(rateLimit.headers);
  headers.set("Cache-Control", "private, max-age=60");
  return Response.json({ data }, { headers });
}
