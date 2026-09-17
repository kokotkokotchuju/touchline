import "server-only";
import { z } from "zod";

const webUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value));
const articleSchema = z.object({
  title: z.string().min(1),
  url: webUrl,
  image: webUrl.nullish().catch(null),
  publishedAt: z.string().datetime(),
  source: z.object({ name: z.string() }),
});
export type NewsArticle = z.infer<typeof articleSchema>;
type Feed = { articles: NewsArticle[]; updatedAt: string; stale: boolean };
let cached: Feed | null = null;
let refreshAt = 0;
let pending: Promise<Feed> | null = null;

// One shared request per process every 30 minutes, including concurrent visitors.
export async function getFootballNews(): Promise<Feed> {
  if (Date.now() < refreshAt) {
    if (cached) return cached;
    throw new Error("News temporarily unavailable");
  }
  if (pending) return pending;
  pending = refresh();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}
async function refresh(): Promise<Feed> {
  try {
    const key = process.env.GNEWS_API_KEY;
    if (!key) throw new Error("News is not configured");
    const url = new URL("https://gnews.io/api/v4/search");
    url.search = new URLSearchParams({
      q: '(soccer OR "Premier League" OR "Champions League" OR "La Liga" OR "Serie A" OR Bundesliga) AND NOT (NFL OR "American football")',
      lang: "en",
      max: "10",
      sortby: "publishedAt",
      nullable: "image,description",
      apikey: key,
    }).toString();
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("News provider unavailable");
    const body = z
      .object({ articles: z.array(z.unknown()) })
      .parse(await response.json());
    const seen = new Set<string>();
    const articles = body.articles.flatMap((value) => {
      const parsed = articleSchema.safeParse(value);
      if (!parsed.success || seen.has(parsed.data.url)) return [];
      seen.add(parsed.data.url);
      return [parsed.data];
    });
    cached = { articles, updatedAt: new Date().toISOString(), stale: false };
    refreshAt = Date.now() + 30 * 60_000;
    return cached;
  } catch {
    refreshAt = Date.now() + 15 * 60_000;
    if (cached) {
      cached = { ...cached, stale: true };
      return cached;
    }
    // Never return provider errors or URLs containing the API key.
    throw new Error("News temporarily unavailable");
  }
}
