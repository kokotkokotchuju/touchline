"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import type { NewsArticle } from "@/server/football/news";

function NewsImage({ src }: { src: NewsArticle["image"] }) {
  const [usable, setUsable] = useState(false);
  const candidate =
    src &&
    !/logo|favicon|placeholder|default[-_]?image|masthead|\/branding\/|\/tncms\/custom\/image\//i.test(
      src,
    );
  return (
    <div className="news-page-image">
      {candidate && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ opacity: usable ? 1 : 0 }}
          onLoad={(event) => {
            const image = event.currentTarget;
            setUsable(
              image.naturalWidth >= 320 &&
                image.naturalHeight >= 180 &&
                image.naturalWidth / image.naturalHeight >= 1.15,
            );
          }}
          onError={() => setUsable(false)}
        />
      )}
      {!usable && (
        <span className="news-page-image-fallback">
          <Newspaper size={28} aria-hidden="true" />
          <small>Click for more</small>
        </span>
      )}
    </div>
  );
}

export function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/news", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setArticles(data.articles);
          setState("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="news-page">
      <div className="news-page-heading">
        <span className="section-kicker">THE LATEST FROM FOOTBALL</span>
        <h1>News</h1>
        <p>Headlines, stories and updates from around the world of football.</p>
      </div>
      {state === "loading" && <p role="status">Loading football news...</p>}
      {state === "error" && (
        <p role="status">Football news is temporarily unavailable.</p>
      )}
      {state === "ready" && !articles.length && <p>No football headlines available yet.</p>}
      <div className="news-page-grid">
        {articles.map((article) => (
          <a
            className="news-page-story"
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NewsImage src={article.image} />
            <span>
              <small>{article.source.name}</small>
              <h2>{article.title}</h2>
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
