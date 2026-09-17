import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Construct only on the server or in the local connectivity checker. */
export function createDatabaseClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // Allow concurrent server-rendered route queries to use separate clients.
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 0,
      statement_timeout: 5000,
    }),
  });
}
