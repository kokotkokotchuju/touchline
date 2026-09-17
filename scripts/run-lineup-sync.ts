import { loadEnvConfig } from "@next/env";
import { getServerEnv } from "../src/server/env";
import { synchronizeSportmonksLineups } from "../src/server/football/sync";
import { ProviderError } from "../src/server/football/providers/football-provider";

loadEnvConfig(process.cwd());

const config = getServerEnv();
if (!config.DATABASE_URL || !config.SPORTMONKS_API_TOKEN) {
  throw new Error("DATABASE_URL and SPORTMONKS_API_TOKEN are required for lineup synchronization.");
}

async function main() {
  const result = await synchronizeSportmonksLineups();
  console.info(JSON.stringify(result));
}

void main().catch((error: unknown) => {
  if (error instanceof ProviderError && error.code === "rate_limited") {
    const wait = error.retryAfterSeconds
      ? ` Retry after approximately ${Math.ceil(error.retryAfterSeconds / 60)} minutes.`
      : "";
    console.error(`SportMonks lineup sync is rate limited.${wait}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
