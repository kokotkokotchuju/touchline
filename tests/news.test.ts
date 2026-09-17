import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("GNEWS_API_KEY", "test-secret");
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const article = {
  title: "Football headline",
  url: "https://example.com/story",
  image: null,
  publishedAt: "2026-09-17T10:00:00Z",
  source: { name: "Example" },
};

it("shares concurrent requests, caches the feed, and excludes unsafe links", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        articles: [
          article,
          article,
          { ...article, url: "javascript:alert(1)" },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { getFootballNews } = await import("../src/server/football/news");
  const [first, second] = await Promise.all([
    getFootballNews(),
    getFootballNews(),
  ]);
  expect(first.articles).toEqual([article]);
  expect(second).toEqual(first);
  await getFootballNews();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(first)).not.toContain("test-secret");
});

it("retains previous headlines on provider failures and backs off retries", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ articles: [article] }))
    .mockResolvedValue(new Response(null, { status: 429 }));
  vi.stubGlobal("fetch", fetcher);
  const { getFootballNews } = await import("../src/server/football/news");
  await getFootballNews();
  vi.advanceTimersByTime(31 * 60_000);
  expect(await getFootballNews()).toMatchObject({
    articles: [article],
    stale: true,
  });
  await getFootballNews();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("hides upstream failures and throttles failed initial loads", async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error("apikey=test-secret"));
  vi.stubGlobal("fetch", fetcher);
  const { getFootballNews } = await import("../src/server/football/news");
  await expect(getFootballNews()).rejects.toThrow(
    "News temporarily unavailable",
  );
  await expect(getFootballNews()).rejects.toThrow(
    "News temporarily unavailable",
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
