// store.ts — Vercel KV persistence layer
// Key schema:
//   articles:{section}        → sorted set of article IDs by timestamp
//   article:{id}              → full SummarizedArticle JSON
//   ratings:{section}         → list of ArticleRating objects
//   addendum:{section}        → latest FeedbackAddendum JSON
//   seen_urls                 → set of URL hashes for deduplication

import { kv } from "@vercel/kv";
import type { SummarizedArticle } from "./summarizer";
import type { ArticleRating, FeedbackAddendum, Section } from "./sources";

const ARTICLE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

// ─── Articles ───────────────────────────────────────────────

/**
 * Store a summarized article. Adds to the section's sorted set
 * and stores the full object separately.
 */
export async function storeArticle(article: SummarizedArticle): Promise<void> {
  const timestamp = new Date(article.fetchedAt).getTime();

  await Promise.all([
    // Add to section's sorted set (score = timestamp for chronological ordering)
    kv.zadd(`articles:${article.section}`, {
      score: timestamp,
      member: article.id,
    }),

    // Store full article object with TTL
    kv.set(`article:${article.id}`, JSON.stringify(article), {
      ex: ARTICLE_TTL_SECONDS,
    }),

    // Track URL as seen for dedup
    kv.sadd("seen_urls", article.id),
  ]);
}

/**
 * Store a batch of articles. Returns count of successfully stored.
 */
export async function storeArticleBatch(
  articles: SummarizedArticle[]
): Promise<number> {
  let stored = 0;
  for (const article of articles) {
    try {
      await storeArticle(article);
      stored++;
    } catch (err) {
      console.error(`[store] Failed to store ${article.id}:`, err);
    }
  }
  return stored;
}

/**
 * Get articles for a section, paginated, sorted by most recent.
 * Optional minimum relevance filter.
 */
export async function getArticles(
  section: Section,
  options: {
    limit?: number;
    offset?: number;
    minRelevance?: number;
  } = {}
): Promise<SummarizedArticle[]> {
  const { limit = 20, offset = 0, minRelevance = 0 } = options;

  // Get IDs from sorted set (reverse chronological)
  // Fetch extra to account for filtering
  const fetchCount = limit + offset + 20;
  const ids = await kv.zrange(`articles:${section}`, 0, fetchCount - 1, {
    rev: true,
  });

  if (!ids || ids.length === 0) return [];

  // Fetch full objects
  const pipeline = kv.pipeline();
  for (const id of ids) {
    pipeline.get(`article:${id}`);
  }
  const results = await pipeline.exec();

  // Parse, filter, paginate
  const articles: SummarizedArticle[] = [];
  for (const raw of results) {
    if (!raw) continue;
    try {
      const article: SummarizedArticle =
        typeof raw === "string" ? JSON.parse(raw) : (raw as SummarizedArticle);
      if (article.relevance >= minRelevance) {
        articles.push(article);
      }
    } catch {
      // skip malformed entries
    }
  }

  return articles.slice(offset, offset + limit);
}

/**
 * Get a single article by ID.
 */
export async function getArticle(
  id: string
): Promise<SummarizedArticle | null> {
  const raw = await kv.get(`article:${id}`);
  if (!raw) return null;
  return typeof raw === "string"
    ? JSON.parse(raw)
    : (raw as SummarizedArticle);
}

/**
 * Check if a URL has already been fetched (by its hash).
 */
export async function isUrlSeen(urlHash: string): Promise<boolean> {
  return (await kv.sismember("seen_urls", urlHash)) === 1;
}

/**
 * Batch check which URL hashes are new (not yet seen).
 */
export async function filterNewUrls(urlHashes: string[]): Promise<string[]> {
  const newHashes: string[] = [];
  for (const hash of urlHashes) {
    const seen = await kv.sismember("seen_urls", hash);
    if (!seen) newHashes.push(hash);
  }
  return newHashes;
}

// ─── Ratings ────────────────────────────────────────────────

/**
 * Store a user rating for an article.
 */
export async function storeRating(rating: ArticleRating): Promise<void> {
  // Append to section's ratings list
  await kv.rpush(`ratings:${rating.section}`, JSON.stringify(rating));

  // Also store on the article itself for display
  await kv.set(`rating:${rating.articleId}`, rating.userRating);
}

/**
 * Get all ratings for a section (for feedback tuning).
 */
export async function getRatings(section: Section): Promise<ArticleRating[]> {
  const raw = await kv.lrange(`ratings:${section}`, 0, -1);
  if (!raw) return [];

  return raw
    .map((item) => {
      try {
        return typeof item === "string"
          ? JSON.parse(item)
          : (item as ArticleRating);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ArticleRating[];
}

/**
 * Get the user's rating for a specific article (or null if unrated).
 */
export async function getArticleRating(
  articleId: string
): Promise<number | null> {
  const rating = await kv.get(`rating:${articleId}`);
  return rating ? Number(rating) : null;
}

/**
 * Get rating counts per section (for the admin dashboard).
 */
export async function getRatingStats(
  section: Section
): Promise<{ total: number; avgUser: number; avgModel: number }> {
  const ratings = await getRatings(section);
  if (ratings.length === 0) return { total: 0, avgUser: 0, avgModel: 0 };

  const avgUser =
    ratings.reduce((s, r) => s + r.userRating, 0) / ratings.length;
  const avgModel =
    ratings.reduce((s, r) => s + r.modelRating, 0) / ratings.length;

  return {
    total: ratings.length,
    avgUser: Math.round(avgUser * 10) / 10,
    avgModel: Math.round(avgModel * 10) / 10,
  };
}

// ─── Feedback Addenda ───────────────────────────────────────

/**
 * Store a feedback addendum for a section.
 */
export async function storeAddendum(
  addendum: FeedbackAddendum
): Promise<void> {
  await kv.set(`addendum:${addendum.section}`, JSON.stringify(addendum));
}

/**
 * Get the latest feedback addendum for a section.
 */
export async function getAddendum(
  section: Section
): Promise<FeedbackAddendum | null> {
  const raw = await kv.get(`addendum:${section}`);
  if (!raw) return null;
  return typeof raw === "string"
    ? JSON.parse(raw)
    : (raw as FeedbackAddendum);
}

// ─── Maintenance ────────────────────────────────────────────

/**
 * Get counts for logging/monitoring.
 */
export async function getSectionCounts(): Promise<
  Record<Section, number>
> {
  const sections: Section[] = [
    "aco",
    "risk-adjustment",
    "quality-cost",
    "ai-vbc",
    "earnings",
    "industry",
  ];
  const counts = {} as Record<Section, number>;

  for (const section of sections) {
    counts[section] = (await kv.zcard(`articles:${section}`)) ?? 0;
  }

  return counts;
}
