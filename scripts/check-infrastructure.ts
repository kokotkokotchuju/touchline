import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { readInfrastructureConfig } =
    await import("../src/server/infrastructure/config");
  const { checkInfrastructure } =
    await import("../src/server/infrastructure/check");
  try {
    const result = await checkInfrastructure(readInfrastructureConfig(), true);
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "ok") process.exitCode = 1;
  } catch {
    console.error(
      "Infrastructure configuration is invalid. Check .env.local; no credentials were logged.",
    );
    process.exitCode = 1;
  }
}
void main();
