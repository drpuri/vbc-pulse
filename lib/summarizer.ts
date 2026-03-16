// summarizer.ts — Claude-powered article summarization + relevance scoring
// Takes raw article content, sends it through section-specific prompts,
// and returns structured data. Composes feedback addenda into prompts.

import Anthropic from "@anthropic-ai/sdk";
import { composeSummarizerPrompt } from "./feedback";
import { RELEVANCE_THRESHOLD } from "./sources";
import type { SectionConfig, FeedbackAddendum } from "./sources";

const client = new Anthropic();

export interface RawArticle {
  url: string;
  title: string;
  rawContent: string; // full text or first ~2000 chars
  source: string; // human-readable source label
  section: string;
  fetchedAt: string;
}

export interface SummarizedArticle {
  id: string; // MD5 hash of URL
  url: string;
  title: string;
  source: string;
  section: string;
  summary: string;
  relevance: number; // 1-5
  deadlines: string[];
  tags: string[];
  fetchedAt: string;
  summarizedAt: string;
}

interface ClaudeResponse {
  summary: string;
  relevance: number;
  deadlines: string[];
  tags: string[];
}

/**
 * Summarize a single article using the section's prompt + feedback addendum.
 * Returns null if the article is below the relevance threshold.
 */
export async function summarizeArticle(
  article: RawArticle,
  sectionConfig: SectionConfig,
  addendum?: FeedbackAddendum
): Promise<SummarizedArticle | null> {
  const systemPrompt = composeSummarizerPrompt(
    sectionConfig.summarizerPrompt,
    addendum
  );

  // Truncate raw content to avoid blowing context — 3000 chars is plenty
  // for a summary. Full articles aren't needed; lead + body is enough signal.
  const truncatedContent = article.rawContent.slice(0, 3000);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Summarize this article. Respond with ONLY valid JSON, no markdown fences.\n\nTitle: ${article.title}\nSource: ${article.source}\nContent:\n${truncatedContent}`,
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const parsed = parseClaudeResponse(rawText);

    if (!parsed) {
      console.error(`[summarizer] Failed to parse response for: ${article.url}`);
      return null;
    }

    // Filter out low-relevance articles
    if (parsed.relevance < RELEVANCE_THRESHOLD) {
      console.log(
        `[summarizer] Filtered (relevance ${parsed.relevance}): ${article.title}`
      );
      return null;
    }

    return {
      id: hashUrl(article.url),
      url: article.url,
      title: article.title,
      source: article.source,
      section: article.section,
      summary: parsed.summary,
      relevance: parsed.relevance,
      deadlines: parsed.deadlines,
      tags: parsed.tags,
      fetchedAt: article.fetchedAt,
      summarizedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[summarizer] API error for ${article.url}:`, err);
    return null;
  }
}

/**
 * Batch summarize articles for a section.
 * Processes sequentially to stay within rate limits.
 * Returns only articles that pass the relevance threshold.
 */
export async function summarizeBatch(
  articles: RawArticle[],
  sectionConfig: SectionConfig,
  addendum?: FeedbackAddendum
): Promise<SummarizedArticle[]> {
  const results: SummarizedArticle[] = [];

  for (const article of articles) {
    const result = await summarizeArticle(article, sectionConfig, addendum);
    if (result) {
      results.push(result);
    }

    // Small delay between calls to be polite to the API
    await sleep(500);
  }

  console.log(
    `[summarizer] ${sectionConfig.id}: ${articles.length} fetched → ${results.length} passed threshold`
  );

  return results;
}

// --- Helpers ---

/**
 * Parse Claude's JSON response, handling common issues:
 * - Markdown code fences (```json ... ```)
 * - Leading/trailing whitespace
 * - Partial JSON from truncated responses
 */
function parseClaudeResponse(raw: string): ClaudeResponse | null {
  try {
    // Strip markdown fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields exist and have correct types
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.relevance !== "number" ||
      !Array.isArray(parsed.tags)
    ) {
      console.error("[summarizer] Malformed response structure:", parsed);
      return null;
    }

    // Clamp relevance to 1-5
    parsed.relevance = Math.max(1, Math.min(5, Math.round(parsed.relevance)));

    // Default deadlines to empty array if missing
    if (!Array.isArray(parsed.deadlines)) {
      parsed.deadlines = [];
    }

    return parsed as ClaudeResponse;
  } catch (err) {
    console.error("[summarizer] JSON parse failed:", raw.slice(0, 200));
    return null;
  }
}

function hashUrl(url: string): string {
  // Use Web Crypto in edge runtime, or Node crypto
  const { createHash } = require("crypto");
  return createHash("md5").update(url).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
