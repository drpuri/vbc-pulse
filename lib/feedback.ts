// feedback.ts — Monthly prompt tuning based on your article ratings
// This is the "RLHF-lite" engine: your 1-5 ratings get analyzed by Claude
// to produce an addendum that sharpens each section's relevance scoring.

import Anthropic from "@anthropic-ai/sdk";
import type { ArticleRating, FeedbackAddendum, Section } from "./sources";

const client = new Anthropic();

interface RatingAnalysis {
  highRated: ArticleRating[]; // 4-5
  lowRated: ArticleRating[];  // 1-2
  misaligned: ArticleRating[]; // big gap between model score and your score
}

function analyzeRatings(ratings: ArticleRating[]): RatingAnalysis {
  return {
    highRated: ratings.filter((r) => r.userRating >= 4),
    lowRated: ratings.filter((r) => r.userRating <= 2),
    misaligned: ratings.filter(
      (r) => Math.abs(r.userRating - r.modelRating) >= 2
    ),
  };
}

/**
 * Generate an updated prompt addendum for a section based on accumulated ratings.
 * Call this monthly (or on-demand) per section.
 */
export async function generateFeedbackAddendum(
  section: Section,
  ratings: ArticleRating[]
): Promise<FeedbackAddendum> {
  const sectionRatings = ratings.filter((r) => r.section === section);

  if (sectionRatings.length < 5) {
    return {
      section,
      generatedAt: new Date().toISOString(),
      prompt: "", // not enough data yet
      articlesAnalyzed: sectionRatings.length,
      avgUserRating: 0,
      avgModelRating: 0,
    };
  }

  const analysis = analyzeRatings(sectionRatings);

  const avgUser =
    sectionRatings.reduce((s, r) => s + r.userRating, 0) /
    sectionRatings.length;
  const avgModel =
    sectionRatings.reduce((s, r) => s + r.modelRating, 0) /
    sectionRatings.length;

  // Build the meta-prompt that asks Claude to generate a better relevance rubric
  const metaPrompt = `You are helping calibrate a news relevance scoring system for a healthcare CMO.

Below are articles that were scored by an AI model and then manually rated by the CMO.
Your job: analyze the patterns in what the CMO rated highly vs. poorly, and produce
a SHORT addendum (3-5 bullet points) that should be appended to the section's 
summarization prompt to improve future relevance scoring.

Focus on:
- What TOPICS the CMO consistently rates high (be specific)
- What TOPICS the CMO consistently rates low
- Where the model's score diverged most from the CMO's rating (and why)
- Any patterns in tags, sources, or article types

HIGH-RATED ARTICLES (CMO gave 4-5):
${analysis.highRated
  .slice(0, 15)
  .map((r) => `- "${r.title}" [tags: ${r.tags.join(", ")}] model: ${r.modelRating}, user: ${r.userRating}`)
  .join("\n")}

LOW-RATED ARTICLES (CMO gave 1-2):
${analysis.lowRated
  .slice(0, 15)
  .map((r) => `- "${r.title}" [tags: ${r.tags.join(", ")}] model: ${r.modelRating}, user: ${r.userRating}`)
  .join("\n")}

MOST MISALIGNED (model and CMO disagreed by 2+ points):
${analysis.misaligned
  .slice(0, 10)
  .map((r) => `- "${r.title}" model: ${r.modelRating}, user: ${r.userRating}`)
  .join("\n")}

Respond with ONLY the addendum text (3-5 bullet points). No preamble.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: metaPrompt }],
  });

  const addendumText =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    section,
    generatedAt: new Date().toISOString(),
    prompt: addendumText,
    articlesAnalyzed: sectionRatings.length,
    avgUserRating: Math.round(avgUser * 10) / 10,
    avgModelRating: Math.round(avgModel * 10) / 10,
  };
}

/**
 * Compose the full summarizer prompt for a section,
 * injecting the latest feedback addendum if available.
 */
export function composeSummarizerPrompt(
  basePrompt: string,
  addendum?: FeedbackAddendum
): string {
  if (!addendum?.prompt) return basePrompt;

  return `${basePrompt}

CALIBRATION NOTES (based on ${addendum.articlesAnalyzed} rated articles, updated ${addendum.generatedAt}):
${addendum.prompt}

Apply these calibration notes when scoring relevance. They reflect the reader's demonstrated preferences.`;
}
