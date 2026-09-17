import { loadEnvConfig } from "@next/env";
import { createDatabaseClient } from "../src/server/infrastructure/postgres";
import {
  requireDevelopmentDatabase,
  SAMPLE_DATE,
  seedDevelopmentData,
} from "./development-data";

async function main() {
  loadEnvConfig(process.cwd());
  const client = createDatabaseClient(requireDevelopmentDatabase(process.env));
  try {
    const counts = await seedDevelopmentData(client);
    console.log(
      `Synthetic development data, reference date ${SAMPLE_DATE}. No real football results.`,
    );
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await client.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    "Development seed failed. Check the migration, DATABASE_URL and ALLOW_DEVELOPMENT_SEED=true in your development environment. No credentials were logged.",
  );
  process.exitCode = 1;
});
