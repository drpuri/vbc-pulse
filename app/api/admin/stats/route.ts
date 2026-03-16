// Admin stats endpoint — returns rating stats and addenda for all sections.

import { NextResponse } from "next/server";
import { SECTIONS } from "@/lib/sources";
import type { Section } from "@/lib/sources";
import { getRatingStats, getAddendum, getArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authSecret = process.env.AUTH_SECRET;
  const providedSecret =
    request.headers.get("x-auth-secret") ||
    new URL(request.url).searchParams.get("secret");

  if (!authSecret || providedSecret !== authSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sections = await Promise.all(
    SECTIONS.map(async (s) => {
      const sectionId = s.id as Section;
      const [ratingStats, addendum, articles] = await Promise.all([
        getRatingStats(sectionId),
        getAddendum(sectionId),
        getArticles(sectionId, { limit: 1 }),
      ]);

      return {
        id: s.id,
        name: s.name,
        articleCount: articles.length > 0 ? articles.length : 0,
        totalRatings: ratingStats.total,
        avgUser: ratingStats.avgUser,
        avgModel: ratingStats.avgModel,
        addendum: addendum?.prompt || null,
        addendumDate: addendum?.generatedAt || null,
        articlesAnalyzed: addendum?.articlesAnalyzed || 0,
      };
    })
  );

  return NextResponse.json({ sections });
}
