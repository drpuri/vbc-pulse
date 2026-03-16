// Rate endpoint — stores user ratings for articles.
// Protected by AUTH_SECRET header.

import { NextResponse } from "next/server";
import { storeRating, getArticle } from "@/lib/store";
import type { ArticleRating, Section } from "@/lib/sources";

export async function POST(request: Request) {
  // Auth check
  const authSecret = process.env.AUTH_SECRET;
  const providedSecret =
    request.headers.get("x-auth-secret") ||
    new URL(request.url).searchParams.get("secret");

  if (!authSecret || providedSecret !== authSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { articleId, section, rating } = body;

    if (!articleId || !section || !rating) {
      return NextResponse.json(
        { error: "Missing articleId, section, or rating" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be 1-5" },
        { status: 400 }
      );
    }

    // Fetch the article to get model's relevance score
    const article = await getArticle(articleId);
    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const articleRating: ArticleRating = {
      articleId,
      section: section as Section,
      userRating: rating,
      modelRating: article.relevance,
      title: article.title,
      summary: article.summary,
      tags: article.tags,
      ratedAt: new Date().toISOString(),
    };

    await storeRating(articleRating);

    return NextResponse.json({ ok: true, rating: articleRating });
  } catch (err) {
    console.error("[rate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
