import { loadEnvConfig } from "@next/env";
import { readInfrastructureConfig } from "../src/server/infrastructure/config";

loadEnvConfig(process.cwd());

async function main() {
  const mode = process.argv[2] === "live" ? "live" : "catalog";
  const config = readInfrastructureConfig();
  if (!config.CRON_SECRET || !config.SITE_URL) {
    throw new Error(
      "CRON_SECRET and SITE_URL are required for scheduled synchronization.",
    );
  }

  const path = mode === "live" ? "/api/cron/live" : "/api/cron/sync";
  const timeoutMs = mode === "live" ? 30_000 : 600_000;
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(new URL(path, config.SITE_URL), {
        headers: { authorization: `Bearer ${config.CRON_SECRET}` },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        throw new Error(
          `${mode} synchronization returned HTTP ${response.status}: ${details}`,
        );
      }
      console.info(
        JSON.stringify({
          event: "scheduled_sync_triggered",
          mode,
          attempt,
          status: response.status,
        }),
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delayMs = 1_000 * 2 ** (attempt - 1);
        console.warn(
          JSON.stringify({
            event: "scheduled_sync_retry",
            mode,
            attempt,
            nextAttemptInMs: delayMs,
            errorType: error instanceof Error ? error.name : "UnknownError",
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${mode} synchronization failed after retries`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
