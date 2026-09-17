import { z } from "zod";

const schema = z
  .object({
    FOOTBALL_READ_MODE: z.enum(["database", "demo"]).optional(),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value))
      .optional(),
    REDIS_URL: z
      .string()
      .url()
      .refine((value) => /^rediss?:\/\//.test(value))
      .optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().startsWith("https://").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    ADMIN_USERNAME: z.string().min(1).optional(),
    ADMIN_PASSWORD: z.string().min(16).optional(),
    CRON_SECRET: z.string().min(20).optional(),
    SITE_URL: z.string().url().optional(),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    API_FOOTBALL_BASE_URL: z.string().url().optional(),
    API_FOOTBALL_KEY: z.string().min(1).optional(),
    API_FOOTBALL_LEAGUES: z.string().optional(),
    API_FOOTBALL_SEASONS: z.string().optional(),
    FOOTBALL_PROVIDER: z.enum(["api-football", "football-data-org", "sportmonks"]).optional(),
    FOOTBALL_STATS_PROVIDER: z.enum(["api-football", "sportmonks"]).optional(),
    FOOTBALL_DATA_TOKEN: z.string().min(1).optional(),
    FOOTBALL_DATA_COMPETITIONS: z.string().optional(),
    SPORTMONKS_API_TOKEN: z.string().min(1).optional(),
    SPORTMONKS_BASE_URL: z.string().url().optional(),
    SPORTMONKS_LEAGUES: z.string().optional(),
    SPORTMONKS_SEASONS: z.string().optional(),
    SPORTMONKS_LINEUP_MATCH_LIMIT: z.coerce.number().int().positive().max(100).optional(),
    ERROR_TRACKING_WEBHOOK_URL: z
      .string()
      .url()
      .startsWith("https://")
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (
      Boolean(values.UPSTASH_REDIS_REST_URL) !==
      Boolean(values.UPSTASH_REDIS_REST_TOKEN)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Both Redis REST variables are required",
        path: ["UPSTASH_REDIS_REST_URL"],
      });
    }
    if (values.REDIS_URL && values.UPSTASH_REDIS_REST_URL) {
      ctx.addIssue({
        code: "custom",
        message: "Choose one Redis transport",
        path: ["REDIS_URL"],
      });
    }
  });

export type InfrastructureConfig = Omit<
  z.infer<typeof schema>,
  "TRUST_PROXY"
> & {
  TRUST_PROXY?: boolean;
};

// Framework-independent so the CLI can use exactly the same validation. Import
// this through server/env.ts inside the application to enforce server-only use.
export function readInfrastructureConfig(
  options: { production?: boolean } = {},
): InfrastructureConfig {
  const result = schema.safeParse({
    FOOTBALL_READ_MODE: process.env.FOOTBALL_READ_MODE || "database",
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    REDIS_URL: process.env.REDIS_URL || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || undefined,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    SITE_URL: process.env.SITE_URL || undefined,
    TRUST_PROXY: process.env.TRUST_PROXY || "false",
    API_FOOTBALL_BASE_URL:
      process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io",
    API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY || undefined,
    API_FOOTBALL_LEAGUES: process.env.API_FOOTBALL_LEAGUES || undefined,
    API_FOOTBALL_SEASONS: process.env.API_FOOTBALL_SEASONS || undefined,
    FOOTBALL_PROVIDER: process.env.FOOTBALL_PROVIDER || "football-data-org",
    FOOTBALL_STATS_PROVIDER: process.env.FOOTBALL_STATS_PROVIDER || "sportmonks",
    FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN || undefined,
    FOOTBALL_DATA_COMPETITIONS: process.env.FOOTBALL_DATA_COMPETITIONS || undefined,
    SPORTMONKS_API_TOKEN: process.env.SPORTMONKS_API_TOKEN || undefined,
    SPORTMONKS_BASE_URL:
      process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v3/football",
    SPORTMONKS_LEAGUES: process.env.SPORTMONKS_LEAGUES || undefined,
    SPORTMONKS_SEASONS: process.env.SPORTMONKS_SEASONS || undefined,
    SPORTMONKS_LINEUP_MATCH_LIMIT:
      process.env.SPORTMONKS_LINEUP_MATCH_LIMIT || undefined,
    ERROR_TRACKING_WEBHOOK_URL:
      process.env.ERROR_TRACKING_WEBHOOK_URL || undefined,
  });
  if (!result.success)
    throw new Error(
      `Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  if (options.production ?? process.env.NODE_ENV === "production") {
    const missing = [
      !result.data.DATABASE_URL && "DATABASE_URL",
      !result.data.REDIS_URL &&
        !result.data.UPSTASH_REDIS_REST_URL &&
        "REDIS_URL",
      (!result.data.ADMIN_USERNAME || !result.data.ADMIN_PASSWORD) &&
        "ADMIN credentials",
      !result.data.CRON_SECRET && "CRON_SECRET",
      (!result.data.SITE_URL ||
        new URL(result.data.SITE_URL).protocol !== "https:") &&
        "HTTPS SITE_URL",
      result.data.TRUST_PROXY !== true && "TRUST_PROXY=true",
    ].filter(Boolean);
    if (missing.length)
      throw new Error(
        `Invalid production configuration: ${missing.join(", ")}`,
      );
  }
  return result.data;
}
