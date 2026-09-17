import { getCacheMetrics } from "@/server/cache";
import { getServerEnv } from "@/server/env";
import { getDb } from "@/server/db";
import { requireSameOrigin } from "@/server/production";
import {
  synchronizeApiFootball,
  synchronizeLiveApiFootball,
} from "@/server/football/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();
  const db = env.DATABASE_URL ? getDb() : null;
  const [providers, competitions, teams, matches] = db
    ? await Promise.all([
        db.dataProvider.findMany({
          select: { key: true, name: true, isDevelopment: true },
        }),
        db.competition.count(),
        db.team.count(),
        db.match.count(),
      ])
    : ([[], 0, 0, 0] as const);
  return Response.json(
    {
      provider: {
        configured: Boolean(
          env.FOOTBALL_PROVIDER === "football-data-org"
            ? env.FOOTBALL_DATA_TOKEN
            : env.FOOTBALL_PROVIDER === "sportmonks"
              ? env.SPORTMONKS_API_TOKEN
            : env.API_FOOTBALL_KEY,
        ),
        records: providers,
      },
      records: { competitions, teams, matches },
      cache: getCacheMetrics(),
      configuration: {
        database: Boolean(env.DATABASE_URL),
        redis: Boolean(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request))
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  const body = (await request.json().catch(() => null)) as {
    action?: string;
  } | null;
  try {
    if (body?.action === "catalog-sync")
      return Response.json(await synchronizeApiFootball());
    if (body?.action === "live-sync")
      return Response.json(await synchronizeLiveApiFootball());
    return Response.json({ error: "Unsupported operation." }, { status: 400 });
  } catch {
    return Response.json(
      { error: "Synchronization failed. Check server logs." },
      { status: 503 },
    );
  }
}
