// Cron endpoint — fetches, summarizes, and stores articles for all sections.
// Triggered by Vercel Cron every 8 hours (see vercel.json).

import { NextResponse } from "next/server";
import { SECTIONS } from "@/lib/sources";
import type { Section } from "@/lib/sources";
import { fetchSection } from "@/lib/fetcher";
import { summarizeBatch } from "@/lib/summarizer";
import { storeArticleBatch, getAddendum } from "@/lib/store";

export const maxDuration = 300; // 5 min for Vercel Pro
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret if set (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { fetched: number; stored: number }> = {};

  for (const section of SECTIONS) {
    try {
      // 1. Fetch raw articles
      const rawArticles = await fetchSection(
        section.sources,
        section.id as Section
      );

      if (rawArticles.length === 0) {
        results[section.id] = { fetched: 0, stored: 0 };
        continue;
      }

      // 2. Get current feedback addendum for this section
      const addendum = await getAddendum(section.id as Section);

      // 3. Summarize + filter by relevance
      const summarized = await summarizeBatch(
        rawArticles,
        section,
        addendum ?? undefined
      );

      // 4. Store in KV
      const storedCount = await storeArticleBatch(summarized);

      results[section.id] = {
        fetched: rawArticles.length,
        stored: storedCount,
      };

      console.log(
        `[cron] ${section.id}: ${rawArticles.length} fetched → ${summarized.length} summarized → ${storedCount} stored`
      );
    } catch (err) {
      console.error(`[cron] Error processing ${section.id}:`, err);
      results[section.id] = { fetched: 0, stored: 0 };
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
