import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/server/env";

export function requireCronSecret(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) return false;
  const supplied = request.headers.get("authorization");
  if (!supplied) return false;
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const configuredOrigins = [
      getServerEnv().SITE_URL?.trim(),
      new URL(request.url).origin,
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL.trim()}`
        : undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
        : undefined,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => new URL(value).origin);
    const matchesOrigin = configuredOrigins.includes(new URL(origin).origin);
    if (
      !process.env.VERCEL &&
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return false;
    return matchesOrigin;
  } catch {
    return false;
  }
}

export function logRequest(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.info(
    JSON.stringify({ event, at: new Date().toISOString(), ...details }),
  );
}
