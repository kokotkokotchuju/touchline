import "server-only";
import { connectRedis } from "@/server/infrastructure/redis";
import { getServerEnv } from "@/server/env";

export type AdminState = {
  featuredCompetitions: string[];
  featuredMatches: string[];
  updatedAt: string | null;
};

const key = "admin:state:v1";
const emptyState: AdminState = {
  featuredCompetitions: [],
  featuredMatches: [],
  updatedAt: null,
};

export async function getAdminState(): Promise<AdminState> {
  const redis = await connectRedis(getServerEnv());
  if (!redis) return emptyState;
  try {
    return (await redis.get<AdminState>(key)) ?? emptyState;
  } finally {
    await redis.close();
  }
}

export async function saveAdminState(state: AdminState) {
  const redis = await connectRedis(getServerEnv());
  if (!redis) throw new Error("Redis is required to persist admin settings.");
  try {
    await redis.set(
      key,
      { ...state, updatedAt: new Date().toISOString() },
      86400,
    );
  } finally {
    await redis.close();
  }
}
