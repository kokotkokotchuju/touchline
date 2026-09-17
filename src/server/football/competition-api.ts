import {
  competitionQuerySchema,
  competitionSlug,
  directoryQuerySchema,
  type CompetitionSection,
} from "@/lib/football/competition-center";
import {
  getCompetitionDirectory,
  getCompetitionPage,
} from "./competition-service";
import { enforceApiRateLimit } from "@/server/http";

const headers = { "Cache-Control": "no-store" };
const invalid = () =>
  Response.json(
    {
      error: {
        code: "INVALID_QUERY",
        message:
          "Check competition filters and supply each parameter only once.",
      },
    },
    { status: 400, headers },
  );
const unavailable = () =>
  Response.json(
    {
      error: {
        code: "DATA_UNAVAILABLE",
        message: "Competition data is temporarily unavailable.",
      },
    },
    { status: 503, headers },
  );
const missing = () =>
  Response.json(
    {
      error: { code: "NOT_FOUND", message: "Competition selection not found." },
    },
    { status: 404, headers },
  );
function parameters(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length > 1))
    return null;
  return Object.fromEntries(params);
}
export async function competitionDirectoryResponse(request: Request) {
  const rateLimit = await enforceApiRateLimit(request, "competitions");
  if (!rateLimit.allowed) return rateLimit.response;
  const parsed = directoryQuerySchema.safeParse(parameters(request));
  if (!parsed.success) return invalid();
  try {
    return Response.json(await getCompetitionDirectory(parsed.data), {
      headers,
    });
  } catch {
    return unavailable();
  }
}
export async function competitionPageResponse(request: Request, slug: string) {
  const rateLimit = await enforceApiRateLimit(request, "competition-detail");
  if (!rateLimit.allowed) return rateLimit.response;
  if (!competitionSlug.safeParse(slug).success) return missing();
  const values = parameters(request);
  if (!values) return invalid();
  const { season, section = "overview", ...filters } = values;
  if (
    (season !== undefined && !competitionSlug.safeParse(season).success) ||
    !["overview", "standings", "matches", "stats"].includes(section)
  )
    return invalid();
  const parsed = competitionQuerySchema.safeParse(filters);
  if (!parsed.success) return invalid();
  try {
    const data = await getCompetitionPage(
      slug,
      season,
      section as CompetitionSection,
      parsed.data,
    );
    return data ? Response.json({ data }, { headers }) : missing();
  } catch {
    return unavailable();
  }
}
