const baseUrl = process.env.PERFORMANCE_BASE_URL ?? "http://localhost:3000";
const paths = ["/", "/matches", "/statistics", "/api/health/ready"];
const samples: Array<{ path: string; status: number; milliseconds: number }> =
  [];

async function main() {
  for (const path of paths) {
    await fetch(new URL(path, baseUrl), { cache: "no-store" });
    const started = performance.now();
    const response = await fetch(new URL(path, baseUrl), { cache: "no-store" });
    samples.push({
      path,
      status: response.status,
      milliseconds: Math.round(performance.now() - started),
    });
  }
  const slow = samples.filter(
    (sample) => sample.status >= 500 || sample.milliseconds > 2000,
  );
  console.info(
    JSON.stringify({
      event: "performance_check_completed",
      baseUrl,
      samples,
      slow,
    }),
  );
  if (slow.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "performance_check_failed",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
