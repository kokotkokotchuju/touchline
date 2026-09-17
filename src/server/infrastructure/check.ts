import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./postgres";
import { connectRedis } from "./redis";
import type { InfrastructureConfig } from "./config";

export type ServiceStatus = "up" | "down" | "not_configured";

export async function checkInfrastructure(
  config: InfrastructureConfig,
  writeProbe = false,
) {
  const [database, redis] = await Promise.all([
    (async (): Promise<ServiceStatus> => {
      if (!config.DATABASE_URL) return "not_configured";
      const client = createDatabaseClient(config.DATABASE_URL);
      try {
        await client.$queryRaw`SELECT 1`;
        return "up";
      } catch {
        return "down";
      } finally {
        await client.$disconnect().catch(() => {});
      }
    })(),
    (async (): Promise<ServiceStatus> => {
      let connection;
      const key = `touchline:health:${randomUUID()}`;
      try {
        connection = await connectRedis(config);
        if (!connection) return "not_configured";
        if (!(await connection.ping())) return "down";
        if (writeProbe) {
          await connection.set(key, { probe: key }, 15);
          if ((await connection.get<{ probe: string }>(key))?.probe !== key)
            return "down";
        }
        return "up";
      } catch {
        return "down";
      } finally {
        if (connection) {
          if (writeProbe) await connection.del(key).catch(() => {});
          await connection.close().catch(() => {});
        }
      }
    })(),
  ]);
  return {
    status: database === "up" && redis === "up" ? "ok" : "unavailable",
    database,
    redis,
  } as const;
}
