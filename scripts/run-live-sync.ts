import { getServerEnv } from "../src/server/env";

const config = getServerEnv();
if (!config.CRON_SECRET || !config.SITE_URL) {
  throw new Error(
    "CRON_SECRET and SITE_URL are required to run live synchronization.",
  );
}
const response = await fetch(new URL("/api/cron/live", config.SITE_URL), {
  headers: { authorization: `Bearer ${config.CRON_SECRET}` },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok)
  throw new Error(`Live synchronization failed with HTTP ${response.status}.`);
console.info(
  JSON.stringify({
    event: "scheduled_live_sync_triggered",
    status: response.status,
  }),
);
