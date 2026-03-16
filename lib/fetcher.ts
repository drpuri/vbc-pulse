// fetcher.ts — Content fetching from RSS, News API, and direct URLs
// Deduplicates via MD5 hash of URLs, returns RawArticle[] for summarization.

import { createHash } from "crypto";
import Parser from "rss-parser";
import type { Source, Section } from "./sources";
import type { RawArticle } from "./summarizer";
import { isUrlSeen } from "./store";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "VBC-Pulse/1.0 (news aggregator)",
  },
});

// Track News API usage across the entire refresh cycle to stay within free tier (100/day).
// Reset at the start of each fetchSection call chain won't help since sections run
// sequentially in the cron — so we use a module-level counter that persists within
// a single serverless invocation.
let newsApiCallCount = 0;
const NEWS_API_MAX_CALLS = 80; // leave headroom

function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex");
}

// ─── RSS Helpers ─────────────────────────────────────────────

/**
 * Extract a clean URL from an RSS item's link field.
 * Handles: raw `<a href="...">` tags, objects with `$` or `href` props,
 * HTML entities (&amp; etc.), and arrays of links.
 */
function cleanLink(raw: unknown): string | null {
  if (!raw) return null;

  // rss-parser can return an object like { $: { href: "..." } } or { href: "..." }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.href === "string") return cleanLink(obj.href);
    if (obj.$ && typeof (obj.$ as Record<string, unknown>).href === "string")
      return cleanLink((obj.$ as Record<string, unknown>).href);
    // Some feeds return an array of link objects
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        const url = cleanLink(entry);
        if (url) return url;
      }
    }
    return null;
  }

  if (typeof raw !== "string") return null;

  let link = raw.trim();

  // Extract href from anchor tags: <a href="https://...">...</a>
  const hrefMatch = link.match(/href\s*=\s*["']([^"']+)["']/i);
  if (hrefMatch) {
    link = hrefMatch[1];
  }

  // Decode HTML entities
  link = link
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Must look like a URL
  if (!link.startsWith("http://") && !link.startsWith("https://")) return null;

  return link;
}

/** Coerce an RSS item's title to a plain string. */
function cleanTitle(raw: unknown): string {
  if (!raw) return "Untitled";
  if (typeof raw === "string") return stripHtml(raw).trim() || "Untitled";
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Some parsers yield { _: "text", $: { type: "html" } }
    if (typeof obj._ === "string") return stripHtml(obj._).trim() || "Untitled";
    if (typeof obj.text === "string") return stripHtml(obj.text).trim() || "Untitled";
  }
  return String(raw);
}

// ─── RSS Fetching ────────────────────────────────────────────

async function fetchRSS(
  source: Source,
  section: Section
): Promise<RawArticle[]> {
  if (!source.url) return [];

  try {
    const feed = await rssParser.parseURL(source.url);
    const articles: RawArticle[] = [];

    for (const item of feed.items.slice(0, 10)) {
      const link = cleanLink(item.link);
      if (!link) continue;

      const urlHash = hashUrl(link);
      if (await isUrlSeen(urlHash)) continue;

      articles.push({
        url: link,
        title: cleanTitle(item.title),
        rawContent: stripHtml(
          String(item.contentSnippet || item.content || item.summary || "")
        ).slice(0, 3000),
        source: source.label,
        section,
        fetchedAt: new Date().toISOString(),
      });
    }

    return articles;
  } catch (err) {
    console.error(`[fetcher] RSS error for ${source.label}:`, err);
    return [];
  }
}

// ─── News API Fetching ───────────────────────────────────────

async function fetchNewsAPI(
  source: Source,
  section: Section
): Promise<RawArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey || !source.query) return [];

  // Respect News API free tier limit
  if (newsApiCallCount >= NEWS_API_MAX_CALLS) {
    console.log(`[fetcher] News API budget exhausted (${newsApiCallCount}/${NEWS_API_MAX_CALLS}), skipping "${source.query}"`);
    return [];
  }
  newsApiCallCount++;

  try {
    const params = new URLSearchParams({
      q: source.query,
      apiKey,
      language: "en",
      sortBy: "publishedAt",
      pageSize: "10",
    });

    const res = await fetch(
      `https://newsapi.org/v2/everything?${params.toString()}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error(`[fetcher] News API ${res.status} for "${source.query}"`);
      return [];
    }

    const data = await res.json();
    const articles: RawArticle[] = [];

    for (const item of data.articles || []) {
      if (!item.url) continue;

      const urlHash = hashUrl(item.url);
      if (await isUrlSeen(urlHash)) continue;

      articles.push({
        url: item.url,
        title: item.title || "Untitled",
        rawContent: [item.description, item.content]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 3000),
        source: source.label,
        section,
        fetchedAt: new Date().toISOString(),
      });
    }

    return articles;
  } catch (err) {
    console.error(`[fetcher] News API error for "${source.query}":`, err);
    return [];
  }
}

// ─── Direct URL Fetching ─────────────────────────────────────

async function fetchDirectURL(
  source: Source,
  section: Section
): Promise<RawArticle[]> {
  if (!source.url) return [];

  try {
    const urlHash = hashUrl(source.url);
    if (await isUrlSeen(urlHash)) return [];

    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "VBC-Pulse/1.0 (news aggregator)",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const content = extractTextContent(html);

    if (content.length < 100) return [];

    const title = extractTitle(html) || source.label;

    return [
      {
        url: source.url,
        title,
        rawContent: content.slice(0, 3000),
        source: source.label,
        section,
        fetchedAt: new Date().toISOString(),
      },
    ];
  } catch (err) {
    console.error(`[fetcher] Direct URL error for ${source.label}:`, err);
    return [];
  }
}

// ─── Main Fetch Function ─────────────────────────────────────

/**
 * Fetch articles from all sources in a section.
 * Returns deduplicated RawArticle[] ready for summarization.
 */
export async function fetchSection(
  sources: Source[],
  section: Section
): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const source of sources) {
    let articles: RawArticle[] = [];

    switch (source.type) {
      case "rss":
        articles = await fetchRSS(source, section);
        break;
      case "search_query":
        articles = await fetchNewsAPI(source, section);
        break;
      case "direct_url":
        articles = await fetchDirectURL(source, section);
        break;
    }

    // Local deduplication within this fetch run
    for (const article of articles) {
      const hash = hashUrl(article.url);
      if (!seenUrls.has(hash)) {
        seenUrls.add(hash);
        allArticles.push(article);
      }
    }
  }

  console.log(
    `[fetcher] ${section}: ${allArticles.length} new articles from ${sources.length} sources`
  );

  return allArticles;
}

// ─── HTML Helpers ────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextContent(html: string): string {
  // Remove script, style, nav, header, footer tags and their content
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  return stripHtml(cleaned);
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : null;
}
