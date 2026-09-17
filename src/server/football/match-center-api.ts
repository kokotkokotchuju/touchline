import { matchQuerySchema, utcToday } from "@/lib/football/match-center";
import {
  getMatchCenterDetail,
  getMatchCenterList,
} from "./match-center-service";
import { enforceApiRateLimit } from "@/server/http";

const headers = { "Cache-Control": "no-store" };
export async function listMatchesResponse(request: Request) {
  const rateLimit = await enforceApiRateLimit(request, "matches");
  if (!rateLimit.allowed) return rateLimit.response;
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length > 1))
    return Response.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: "Supply each filter only once.",
        },
      },
      { status: 400, headers },
    );
  const parsed = matchQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "INVALID_QUERY",
          message:
            "Check date, status, competition, country, timeZone and cursor filters.",
        },
      },
      { status: 400, headers },
    );
  try {
    return Response.json(
      await getMatchCenterList({
        ...parsed.data,
        date: parsed.data.date ?? utcToday(),
      }),
      { headers },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "DATA_UNAVAILABLE",
          message: "Match data is temporarily unavailable.",
        },
      },
      { status: 503, headers },
    );
  }
}
export async function matchDetailResponse(publicId: string) {
  if (
    !/^[1-9][0-9]{0,18}$/.test(publicId) ||
    BigInt(publicId) > BigInt("9223372036854775807")
  )
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Match not found." } },
      { status: 404, headers },
    );
  try {
    const data = await getMatchCenterDetail(publicId);
    return data
      ? Response.json({ data }, { headers })
      : Response.json(
          { error: { code: "NOT_FOUND", message: "Match not found." } },
          { status: 404, headers },
        );
  } catch {
    return Response.json(
      {
        error: {
          code: "DATA_UNAVAILABLE",
          message: "Match data is temporarily unavailable.",
        },
      },
      { status: 503, headers },
    );
  }
}
