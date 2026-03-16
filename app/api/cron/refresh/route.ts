// Cron endpoint — regenerates addenda from latest ratings, then fetches,
// summarizes, and stores articles for all sections. Phase 3 sweeps thin sections.
// Triggered by Vercel Cron weekly (see vercel.json).
// Saves progress to KV incrementally so partial results survive timeouts.

import { NextResponse } from "next/server";
import { SECTIONS } from "@/lib/sources";
import type { Section } from "@/lib/sources";
import { fetchSection, fetchSweep } from "@/lib/fetcher";
import { summarizeBatch } from "@/lib/summarizer";
import { generateFeedbackAddendum } from "@/lib/feedback";
import { kv } from "@vercel/kv";
import {
  storeArticleBatch,
  getAddendum,
  getRatings,
  storeAddendum,
} from "@/lib/store";

export const maxDuration = 300; // 5 min for Vercel Pro
export const dynamic = "force-dynamic";

/** Save current progress to KV so the admin page can always show latest state. */
async function saveProgress(
  tuneResults: Record<string, { ratingsUsed: number; tuned: boolean }>,
  fetchResults: Record<string, { fetched: number; stored: number; highScoring: number }>,
  sweepResults: Record<string, { triggered: boolean; fetched: number; stored: number }>,
  status: "in_progress" | "complete"
) {
  const timestamp = new Date().toISOString();
  await kv.set(
    "last_refresh",
    JSON.stringify({ timestamp, status, tuning: tuneResults, articles: fetchResults, sweep: sweepResults })
  );
}

export async function GET(request: Request) {
  // Verify cron secret if set (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tuneResults: Record<string, { ratingsUsed: number; tuned: boolean }> =
    {};
  const fetchResults: Record<string, { fetched: number; stored: number; highScoring: number }> = {};
  const sweepResults: Record<string, { triggered: boolean; fetched: number; stored: number }> = {};

  // Save initial progress marker
  await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");

  // ── Phase 1: Auto-tune addenda from latest ratings ──────────
  for (const section of SECTIONS) {
    const sectionId = section.id as Section;
    try {
      const ratings = await getRatings(sectionId);

      if (ratings.length >= 5) {
        const addendum = await generateFeedbackAddendum(sectionId, ratings);
        await storeAddendum(addendum);
        tuneResults[section.id] = { ratingsUsed: ratings.length, tuned: true };
        console.log(
          `[cron] ${section.id}: tuned addendum from ${ratings.length} ratings`
        );
      } else {
        tuneResults[section.id] = {
          ratingsUsed: ratings.length,
          tuned: false,
        };
        console.log(
          `[cron] ${section.id}: skipped tuning (${ratings.length} ratings, need 5)`
        );
      }
    } catch (err) {
      console.error(`[cron] Tune error for ${section.id}:`, err);
      tuneResults[section.id] = { ratingsUsed: 0, tuned: false };
    }
  }

  // Save after tuning completes
  await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");

  // ── Phase 2: Fetch, summarize, store ────────────────────────
  for (const section of SECTIONS) {
    const sectionId = section.id as Section;
    try {
      // 1. Fetch raw articles (pass searchDepth)
      const rawArticles = await fetchSection(
        section.sources,
        sectionId,
        section.searchDepth ?? 5
      );

      if (rawArticles.length === 0) {
        fetchResults[section.id] = { fetched: 0, stored: 0, highScoring: 0 };
        await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");
        continue;
      }

      // 2. Get freshly-tuned addendum
      const addendum = await getAddendum(sectionId);

      // 3. Summarize + filter by relevance
      const summarized = await summarizeBatch(
        rawArticles,
        section,
        addendum ?? undefined
      );

      // 4. Store in KV
      const storedCount = await storeArticleBatch(summarized);

      // 5. Count high-scoring articles (relevance >= 4)
      const highScoring = summarized.filter((a) => a.relevance >= 4).length;

      fetchResults[section.id] = {
        fetched: rawArticles.length,
        stored: storedCount,
        highScoring,
      };

      console.log(
        `[cron] ${section.id}: ${rawArticles.length} fetched → ${summarized.length} summarized → ${storedCount} stored (${highScoring} high-scoring)`
      );
    } catch (err) {
      console.error(`[cron] Fetch error for ${section.id}:`, err);
      fetchResults[section.id] = { fetched: 0, stored: 0, highScoring: 0 };
    }

    // Save progress after each section completes
    await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");
  }

  // ── Phase 3: Sweep thin sections ────────────────────────────
  for (const section of SECTIONS) {
    const sectionId = section.id as Section;
    const sectionFetch = fetchResults[section.id];
    const highScoring = sectionFetch?.highScoring ?? 0;

    // Only sweep if section has a sweepQuery and fewer than 3 high-scoring articles
    if (!section.sweepQuery || highScoring >= 3) {
      sweepResults[section.id] = { triggered: false, fetched: 0, stored: 0 };
      continue;
    }

    console.log(
      `[cron] ${section.id}: only ${highScoring} high-scoring articles, triggering sweep`
    );

    try {
      const rawArticles = await fetchSweep(section.sweepQuery, sectionId, 10);

      if (rawArticles.length === 0) {
        sweepResults[section.id] = { triggered: true, fetched: 0, stored: 0 };
        await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");
        continue;
      }

      const addendum = await getAddendum(sectionId);
      const summarized = await summarizeBatch(
        rawArticles,
        section,
        addendum ?? undefined
      );
      const storedCount = await storeArticleBatch(summarized);

      sweepResults[section.id] = {
        triggered: true,
        fetched: rawArticles.length,
        stored: storedCount,
      };

      console.log(
        `[cron] ${section.id} sweep: ${rawArticles.length} fetched → ${summarized.length} summarized → ${storedCount} stored`
      );
    } catch (err) {
      console.error(`[cron] Sweep error for ${section.id}:`, err);
      sweepResults[section.id] = { triggered: true, fetched: 0, stored: 0 };
    }

    await saveProgress(tuneResults, fetchResults, sweepResults, "in_progress");
  }

  // Final save as complete
  await saveProgress(tuneResults, fetchResults, sweepResults, "complete");

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    tuning: tuneResults,
    articles: fetchResults,
    sweep: sweepResults,
  });
}
