"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SECTIONS } from "@/lib/sources";
import type { SummarizedArticle } from "@/lib/summarizer";

interface FeedResponse {
  section: string;
  count: number;
  articles: SummarizedArticle[];
}

function RatingWidget({
  articleId,
  section,
  currentRating,
}: {
  articleId: string;
  section: string;
  currentRating: number | null;
}) {
  const [rating, setRating] = useState<number | null>(currentRating);
  const [hovering, setHovering] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitRating(value: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-secret": getCookie("auth_secret") || "",
        },
        body: JSON.stringify({ articleId, section, rating: value }),
      });
      if (res.ok) setRating(value);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }

  const isAuthed = typeof document !== "undefined" && getCookie("auth_secret");
  if (!isAuthed) return null;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          onClick={() => submitRating(v)}
          onMouseEnter={() => setHovering(v)}
          onMouseLeave={() => setHovering(null)}
          disabled={saving}
          className={`w-6 h-6 text-xs font-mono rounded transition-colors ${
            (hovering ?? rating ?? 0) >= v
              ? "bg-terminal-accent text-terminal-bg"
              : "bg-terminal-border text-terminal-muted hover:bg-terminal-accent/30"
          }`}
        >
          {v}
        </button>
      ))}
      {rating && (
        <span className="text-xs font-mono text-terminal-muted ml-1">
          Rated
        </span>
      )}
    </div>
  );
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export default function SectionPage() {
  const params = useParams();
  const sectionId = params.section as string;

  const [articles, setArticles] = useState<SummarizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [minRelevance, setMinRelevance] = useState(0);
  const [sortBy, setSortBy] = useState<"date" | "relevance">("date");

  const sectionConfig = SECTIONS.find((s) => s.id === sectionId);

  const fetchArticles = useCallback(
    async (reset = false) => {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;
      try {
        const res = await fetch(
          `/api/feed/${sectionId}?limit=20&offset=${currentOffset}&minRelevance=${minRelevance}`
        );
        const data: FeedResponse = await res.json();

        if (reset) {
          setArticles(data.articles);
          setOffset(20);
        } else {
          setArticles((prev) => [...prev, ...data.articles]);
          setOffset((prev) => prev + 20);
        }
        setHasMore(data.count === 20);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    },
    [sectionId, offset, minRelevance]
  );

  useEffect(() => {
    fetchArticles(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, minRelevance]);

  const sortedArticles = [...articles].sort((a, b) => {
    if (sortBy === "relevance") return b.relevance - a.relevance;
    return (
      new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
    );
  });

  if (!sectionConfig) {
    return (
      <div className="text-center py-20">
        <h1 className="font-mono text-xl text-terminal-danger mb-2">
          Section not found
        </h1>
        <Link href="/" className="text-terminal-accent font-mono text-sm">
          &larr; Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs font-mono text-terminal-muted hover:text-terminal-accent transition-colors"
        >
          &larr; Dashboard
        </Link>
        <h1 className="font-mono text-2xl font-bold mt-2">
          <span className="text-terminal-accent">&gt;</span>{" "}
          {sectionConfig.name}
        </h1>
        <p className="text-terminal-muted text-sm mt-1">
          {sectionConfig.description}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-terminal-muted">
            Min relevance:
          </label>
          {[0, 3, 4, 5].map((v) => (
            <button
              key={v}
              onClick={() => setMinRelevance(v)}
              className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                minRelevance === v
                  ? "bg-terminal-accent text-terminal-bg"
                  : "bg-terminal-surface border border-terminal-border text-terminal-muted hover:border-terminal-accent"
              }`}
            >
              {v === 0 ? "All" : `${v}+`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-terminal-muted">
            Sort:
          </label>
          <button
            onClick={() => setSortBy("date")}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              sortBy === "date"
                ? "bg-terminal-accent text-terminal-bg"
                : "bg-terminal-surface border border-terminal-border text-terminal-muted hover:border-terminal-accent"
            }`}
          >
            Date
          </button>
          <button
            onClick={() => setSortBy("relevance")}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              sortBy === "relevance"
                ? "bg-terminal-accent text-terminal-bg"
                : "bg-terminal-surface border border-terminal-border text-terminal-muted hover:border-terminal-accent"
            }`}
          >
            Relevance
          </button>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-4">
        {sortedArticles.map((article) => (
          <article key={article.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-terminal-text hover:text-terminal-accent transition-colors line-clamp-2"
                >
                  {article.title}
                </a>
                <p className="text-sm text-terminal-muted mt-2 leading-relaxed">
                  {article.summary}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded ${
                    article.relevance >= 4
                      ? "bg-terminal-accent/20 text-terminal-accent"
                      : article.relevance >= 3
                        ? "bg-terminal-warn/20 text-terminal-warn"
                        : "bg-terminal-border text-terminal-muted"
                  }`}
                >
                  {article.relevance}/5
                </span>
              </div>
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {article.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Deadlines */}
            {article.deadlines.length > 0 && (
              <div className="mt-2 text-xs font-mono text-terminal-warn">
                Deadlines: {article.deadlines.join(" | ")}
              </div>
            )}

            {/* Attribution + Rating */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-terminal-border">
              <span className="text-xs font-mono text-terminal-muted">
                via {article.source} &middot;{" "}
                {new Date(article.fetchedAt).toLocaleDateString()}
              </span>
              <RatingWidget
                articleId={article.id}
                section={sectionId}
                currentRating={null}
              />
            </div>
          </article>
        ))}
      </div>

      {/* Loading / Load More */}
      {loading && (
        <div className="text-center py-8">
          <span className="font-mono text-sm text-terminal-muted animate-pulse">
            Loading...
          </span>
        </div>
      )}

      {!loading && sortedArticles.length === 0 && (
        <div className="text-center py-20">
          <p className="font-mono text-terminal-muted">
            No articles yet. Waiting for first fetch cycle.
          </p>
        </div>
      )}

      {!loading && hasMore && sortedArticles.length > 0 && (
        <div className="text-center py-8">
          <button onClick={() => fetchArticles(false)} className="btn-ghost">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
