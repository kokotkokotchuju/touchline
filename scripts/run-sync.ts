import { loadEnvConfig } from "@next/env";
import { getServerEnv } from "../src/server/env";

loadEnvConfig(process.cwd());

const config = getServerEnv();
if (!config.CRON_SECRET || !config.SITE_URL) {
  throw new Error(
    "CRON_SECRET and SITE_URL are required to run synchronization.",
  );
}

async function main() {
  const response = await fetch(new URL("/api/cron/sync", config.SITE_URL), {
    headers: { authorization: `Bearer ${config.CRON_SECRET}` },
    signal: AbortSignal.timeout(600_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Synchronization failed with HTTP ${response.status}${detail ? `: ${detail}` : "."}`,
    );
  }
  console.info(
    JSON.stringify({
      event: "scheduled_sync_triggered",
      status: response.status,
    }),
  );
}

void main();
