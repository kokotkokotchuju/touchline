import "server-only";
import { createDatabaseClient } from "./infrastructure/postgres";
import { getServerEnv } from "./env";

const globalDb = globalThis as unknown as {
  footballPrisma?: ReturnType<typeof createDatabaseClient>;
  footballDatabaseUrl?: string;
};

export function getDb() {
  const { DATABASE_URL } = getServerEnv();
  if (!DATABASE_URL)
    throw new Error("DATABASE_URL is required to use PostgreSQL.");
  if (!globalDb.footballPrisma || globalDb.footballDatabaseUrl !== DATABASE_URL) {
    globalDb.footballPrisma = createDatabaseClient(DATABASE_URL);
    globalDb.footballDatabaseUrl = DATABASE_URL;
  }
  return globalDb.footballPrisma;
}
