import { getAdminState, saveAdminState, type AdminState } from "@/server/admin";
import { requireSameOrigin } from "@/server/production";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getAdminState(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request))
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    return Response.json({ error: "JSON is required." }, { status: 415 });
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 100_000)
    return Response.json(
      { error: "Request body is too large." },
      { status: 413 },
    );
  let body: Partial<AdminState>;
  try {
    body = (await request.json()) as Partial<AdminState>;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const state: AdminState = {
    featuredCompetitions: Array.isArray(body.featuredCompetitions)
      ? body.featuredCompetitions
          .filter((value): value is string => typeof value === "string")
          .slice(0, 20)
      : [],
    featuredMatches: Array.isArray(body.featuredMatches)
      ? body.featuredMatches
          .filter((value): value is string => typeof value === "string")
          .slice(0, 20)
      : [],
    updatedAt: null,
  };
  try {
    await saveAdminState(state);
  } catch {
    return Response.json(
      { error: "Admin state could not be saved." },
      { status: 503 },
    );
  }
  return Response.json(await getAdminState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
