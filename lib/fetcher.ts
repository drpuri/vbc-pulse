// fetcher.ts — Content fetching from RSS, Anthropic web search, and direct URLs
// Deduplicates via MD5 hash of URLs, returns RawArticle[] for summarization.

import { createHash } from "crypto";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import type { Source, Section, SectionConfig } from "./sources";
import type { RawArticle } from "./summarizer";
import { isUrlSeen } from "./store";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "VBC-Pulse/1.0 (news aggregator)",
  },
});

const anthropic = new Anthropic();

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

// ─── Anthropic Web Search ────────────────────────────────────

interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Use Anthropic's server-side web_search tool to find recent articles.
 * Replaces the old News API integration.
 */
async function fetchWebSearch(
  source: Source,
  section: Section,
  maxResults: number
): Promise<RawArticle[]> {
  if (!source.query) return [];

  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Find up to ${maxResults} recent news articles about: ${source.query}

Return ONLY a JSON array of objects with these fields:
- "url": the article URL
- "title": the article title
- "snippet": a 1-2 sentence description of the article

Respond with ONLY the JSON array, no markdown fences or other text.`,
      },
    ];

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages,
    });

    // Handle server-side tool loop — continue until Claude finishes
    while (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Continue searching and provide the results." });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
        messages,
      });
    }

    // Extract text content from final response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.log(`[fetcher] No text response for web search "${source.query}"`);
      return [];
    }

    const results = parseSearchResults(textBlock.text);
    const articles: RawArticle[] = [];

    for (const result of results) {
      if (!result.url) continue;

      const urlHash = hashUrl(result.url);
      if (await isUrlSeen(urlHash)) continue;

      articles.push({
        url: result.url,
        title: result.title || "Untitled",
        rawContent: result.snippet || "",
        source: source.label,
        section,
        fetchedAt: new Date().toISOString(),
      });
    }

    console.log(
      `[fetcher] Web search "${source.query}": ${results.length} results, ${articles.length} new`
    );

    return articles;
  } catch (err) {
    console.error(`[fetcher] Web search error for "${source.query}":`, err);
    return [];
  }
}

/**
 * Parse Claude's JSON response containing search results.
 * Handles markdown fences and malformed JSON gracefully.
 */
function parseSearchResults(raw: string): WebSearchResult[] {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as WebSearchResult).url === "string"
    );
  } catch {
    console.error("[fetcher] Failed to parse web search results:", raw.slice(0, 200));
    return [];
  }
}

// ─── Sweep Search ────────────────────────────────────────────

/**
 * Broad sweep search for a section using a general query.
 * Used to backfill thin sections that didn't get enough high-quality content.
 */
export async function fetchSweep(
  query: string,
  section: Section,
  maxResults: number = 10
): Promise<RawArticle[]> {
  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Find up to ${maxResults} of the most important and recent news articles about: ${query}

Focus on high-quality sources and substantive articles from the past week.

Return ONLY a JSON array of objects with these fields:
- "url": the article URL
- "title": the article title
- "snippet": a 1-2 sentence description of the article

Respond with ONLY the JSON array, no markdown fences or other text.`,
      },
    ];

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages,
    });

    while (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: "Continue searching and provide the results." });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.log(`[fetcher] No text response for sweep "${query}"`);
      return [];
    }

    const results = parseSearchResults(textBlock.text);
    const articles: RawArticle[] = [];

    for (const result of results) {
      if (!result.url) continue;

      const urlHash = hashUrl(result.url);
      if (await isUrlSeen(urlHash)) continue;

      articles.push({
        url: result.url,
        title: result.title || "Untitled",
        rawContent: result.snippet || "",
        source: "sweep",
        section,
        fetchedAt: new Date().toISOString(),
      });
    }

    console.log(
      `[fetcher] Sweep "${query}": ${results.length} results, ${articles.length} new`
    );

    return articles;
  } catch (err) {
    console.error(`[fetcher] Sweep error for "${query}":`, err);
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
  section: Section,
  searchDepth: number = 5
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
        articles = await fetchWebSearch(source, section, searchDepth);
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
