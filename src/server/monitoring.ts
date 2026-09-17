import "server-only";

import { getServerEnv } from "@/server/env";
import { logRequest } from "@/server/production";

type ErrorContext = { operation: string; requestId?: string; route?: string };

export async function reportServerError(error: unknown, context: ErrorContext) {
  const message =
    error instanceof Error ? error.message : "Unknown server error";
  const event = {
    event: "server_error",
    operation: context.operation,
    route: context.route,
    requestId: context.requestId,
    errorType: error instanceof Error ? error.name : "UnknownError",
    message: message.slice(0, 500),
  };
  logRequest("server_error", event);
  const webhook = getServerEnv().ERROR_TRACKING_WEBHOOK_URL;
  if (!webhook) return;
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      logRequest("error_tracking_delivery_failed", { status: response.status });
  } catch (trackingError) {
    logRequest("error_tracking_delivery_failed", {
      errorType:
        trackingError instanceof Error ? trackingError.name : "UnknownError",
    });
  }
}
