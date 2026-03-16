// Feedback tuning endpoint — generates a new prompt addendum for a section
// based on accumulated ratings. Call monthly or on-demand.

import { NextResponse } from "next/server";
import { generateFeedbackAddendum } from "@/lib/feedback";
import { getRatings, storeAddendum } from "@/lib/store";
import type { Section } from "@/lib/sources";

export async function POST(request: Request) {
  // Auth check
  const authSecret = process.env.AUTH_SECRET;
  const providedSecret = request.headers.get("x-auth-secret");

  if (!authSecret || providedSecret !== authSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { section } = body;

    if (!section) {
      return NextResponse.json(
        { error: "Missing section" },
        { status: 400 }
      );
    }

    const validSections: Section[] = [
      "aco",
      "risk-adjustment",
      "quality-cost",
      "ai-vbc",
      "earnings",
    ];
    if (!validSections.includes(section as Section)) {
      return NextResponse.json(
        { error: "Invalid section" },
        { status: 400 }
      );
    }

    // Get all ratings for this section
    const ratings = await getRatings(section as Section);

    // Generate the addendum
    const addendum = await generateFeedbackAddendum(
      section as Section,
      ratings
    );

    // Store it
    await storeAddendum(addendum);

    return NextResponse.json({ ok: true, addendum });
  } catch (err) {
    console.error("[tune] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
