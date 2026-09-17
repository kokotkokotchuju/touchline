"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Newspaper } from "lucide-react";
import type { NewsArticle } from "@/server/football/news";

function NewsThumbnail({ src }: { src: NewsArticle["image"] }) {
  const [usable, setUsable] = useState(false);
  // News feeds sometimes supply a masthead or site icon instead of a photo.
  const candidate =
    src &&
    !/logo|favicon|placeholder|default[-_]?image|masthead|\/branding\/|\/tncms\/custom\/image\//i.test(
      src,
    );
  return (
    <span
      className="home-result-art home-news-image home-news-photo"
      aria-hidden="true"
    >
      {candidate && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ opacity: usable ? 1 : 0 }}
          onLoad={(event) => {
            const { naturalWidth: width, naturalHeight: height } =
              event.currentTarget;
            setUsable(
              width >= 320 &&
                height >= 180 &&
                width / height >= 1.15 &&
                width / height <= 2.2,
            );
          }}
          onError={() => setUsable(false)}
        />
      )}
    </span>
  );
}

export function NewsCard() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = useState(false);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/news", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setArticles(data.articles);
        setStale(data.stale);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="home-rail-card" aria-label="Football news">
      <div className="home-rail-title">
        <h2>
          <Newspaper size={19} /> Latest from the pitch
        </h2>
        {articles.length > 3 && (
          <button
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "View all"} <ArrowRight size={13} />
          </button>
        )}
      </div>
      {state === "loading" && (
        <p className="home-rail-empty" role="status">
          Loading football news...
        </p>
      )}
      {state === "error" && (
        <p className="home-rail-empty" role="status">
          Football news is temporarily unavailable. Please check back later.
        </p>
      )}
      {state === "ready" && !articles.length && (
        <p className="home-rail-empty">No football headlines available yet.</p>
      )}
      {articles.slice(0, expanded ? 10 : 3).map((article) => (
        <a
          className="home-result home-news-story"
          key={article.url}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <NewsThumbnail key={article.image} src={article.image} />
          <span>
            <small>{article.source.name}</small>
            <strong>{article.title}</strong>
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}{" "}
              · Read article ↗
            </time>
          </span>
        </a>
      ))}
      {articles.length > 0 && (
        <p className="home-source">
          {stale ? "Showing previously loaded headlines · " : ""}News via GNews
        </p>
      )}
    </section>
  );
}
