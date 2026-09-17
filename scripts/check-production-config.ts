import { readInfrastructureConfig } from "../src/server/infrastructure/config";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

try {
  readInfrastructureConfig({ production: true });
  console.info(JSON.stringify({ event: "production_configuration_valid" }));
} catch (error) {
  console.error(
    JSON.stringify({
      event: "production_configuration_invalid",
      message: error instanceof Error ? error.message : "invalid configuration",
    }),
  );
  process.exitCode = 1;
}
