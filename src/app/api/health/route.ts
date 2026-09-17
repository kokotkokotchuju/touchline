import { getServerEnv } from "@/server/env";

export function GET() {
  let configuration = "ok";
  try {
    getServerEnv();
  } catch {
    configuration = "invalid";
  }
  return Response.json(
    {
      status: configuration === "ok" ? "ok" : "degraded",
      dataSource: "demo",
      configuration,
    },
    {
      status: configuration === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
