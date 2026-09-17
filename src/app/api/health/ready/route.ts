import { getServerEnv } from "@/server/env";
import { checkInfrastructure } from "@/server/infrastructure/check";
import { logRequest } from "@/server/production";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const result = await checkInfrastructure(getServerEnv());
    logRequest("readiness_check", result);
    return Response.json(result, {
      status: result.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { status: "unavailable", reason: "configuration" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
