import { requireCronSecret, logRequest } from "@/server/production";
import { getFootballSnapshot } from "@/server/football/service";
import { synchronizeFootball } from "@/server/football/sync";
import { ProviderError } from "@/server/football/providers/football-provider";
import { reportServerError } from "@/server/monitoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireCronSecret(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const sync = await synchronizeFootball();
    const snapshot = await getFootballSnapshot();
    logRequest("scheduled_sync_completed", sync);
    return Response.json(
      {
        status: "ok",
        ...sync,
        source: snapshot.source,
        generatedAt: snapshot.generatedAt,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    await reportServerError(error, {
      operation: "catalog_sync",
      route: "/api/cron/sync",
    });
    const status =
      error instanceof ProviderError && error.code === "rate_limited"
        ? 429
        : 502;
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Catalog synchronization failed",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
