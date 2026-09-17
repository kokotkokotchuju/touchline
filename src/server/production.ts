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
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  try {
    return (
      new URL(origin).origin ===
      new URL(getServerEnv().SITE_URL ?? "http://localhost:3000").origin
    );
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
