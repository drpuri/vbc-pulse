// Feed endpoint — returns paginated articles for a section.
// GET /api/feed/aco?limit=20&offset=0&minRelevance=3

import { NextResponse } from "next/server";
import { getArticles } from "@/lib/store";
import type { Section } from "@/lib/sources";

const VALID_SECTIONS: Section[] = [
  "aco",
  "risk-adjustment",
  "quality-cost",
  "ai-vbc",
  "earnings",
];

export async function GET(
  request: Request,
  { params }: { params: { section: string } }
) {
  const section = params.section as Section;

  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json(
      { error: "Invalid section. Valid: " + VALID_SECTIONS.join(", ") },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") || "20"))
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") || "0")
  );
  const minRelevance = Math.max(
    0,
    parseInt(url.searchParams.get("minRelevance") || "0")
  );

  try {
    const articles = await getArticles(section, {
      limit,
      offset,
      minRelevance,
    });

    return NextResponse.json({
      section,
      count: articles.length,
      articles,
    });
  } catch (err) {
    console.error(`[feed] Error for ${section}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
