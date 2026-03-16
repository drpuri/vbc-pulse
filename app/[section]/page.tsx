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

function RelevanceBadge({ score }: { score: number }) {
  const cls = score >= 5 ? "badge-5" : score >= 4 ? "badge-4" : "badge-3";
  return <span className={cls}>{score}/5</span>;
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
          className={`w-7 h-7 text-xs rounded-md transition-colors ${
            (hovering ?? rating ?? 0) >= v
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {v}
        </button>
      ))}
      {rating && (
        <span className="text-xs text-gray-400 ml-1">Rated</span>
      )}
    </div>
  );
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Section not found
        </h1>
        <Link href="/" className="text-brand-600 text-sm hover:underline">
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
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {sectionConfig.name}
        </h1>
        <p className="text-gray-500 mt-1">{sectionConfig.description}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-5 border-b border-gray-200">
        <span className="text-xs text-gray-400 mr-1">Relevance:</span>
        {[0, 3, 4, 5].map((v) => (
          <FilterButton
            key={v}
            active={minRelevance === v}
            onClick={() => setMinRelevance(v)}
          >
            {v === 0 ? "All" : `${v}+`}
          </FilterButton>
        ))}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <span className="text-xs text-gray-400 mr-1">Sort:</span>
        <FilterButton
          active={sortBy === "date"}
          onClick={() => setSortBy("date")}
        >
          Latest
        </FilterButton>
        <FilterButton
          active={sortBy === "relevance"}
          onClick={() => setSortBy("relevance")}
        >
          Relevance
        </FilterButton>
      </div>

      {/* Articles */}
      <div className="space-y-4">
        {sortedArticles.map((article) => (
          <article key={article.id} className="card">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RelevanceBadge score={article.relevance} />
                  <span className="text-xs text-gray-400">
                    {article.source} &middot;{" "}
                    {new Date(article.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-gray-900 hover:text-brand-600 transition-colors leading-snug"
                >
                  {article.title}
                </a>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {article.summary}
                </p>

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
                  <div className="mt-2 text-xs font-medium text-amber-600">
                    Deadlines: {article.deadlines.join(" | ")}
                  </div>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-end mt-4 pt-3 border-t border-gray-100">
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
          <span className="text-sm text-gray-400 animate-pulse">
            Loading...
          </span>
        </div>
      )}

      {!loading && sortedArticles.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">
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
