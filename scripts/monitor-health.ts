const healthUrl = process.env.HEALTHCHECK_URL;
const alertUrl = process.env.HEALTH_ALERT_WEBHOOK_URL;

export {};

if (!healthUrl) throw new Error("HEALTHCHECK_URL is required.");

const response = await fetch(healthUrl, {
  signal: AbortSignal.timeout(10_000),
  cache: "no-store",
});
if (!response.ok) {
  if (alertUrl) {
    await fetch(alertUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "down",
        service: "touchline",
        url: healthUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  }
  throw new Error(`Health check failed with HTTP ${response.status}.`);
}
console.info(JSON.stringify({ event: "health_check_passed", url: healthUrl }));
