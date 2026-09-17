import { synchronizeLiveApiFootball } from "@/server/football/sync";
import { requireCronSecret, logRequest } from "@/server/production";
import { reportServerError } from "@/server/monitoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireCronSecret(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await synchronizeLiveApiFootball();
    logRequest("scheduled_live_sync_completed", result);
    return Response.json(
      { status: "ok", ...result },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    await reportServerError(error, { operation: "live_sync", route: "/api/cron/live" });
    return Response.json(
      { error: "Live synchronization is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
