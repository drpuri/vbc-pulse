# VBC Pulse — Claude Code Build Instructions

## What this is
A Next.js 14 (App Router) site that auto-curates value-based care news across 4 sections,
with a feedback loop where my article ratings improve relevance scoring over time.

## Tech stack
- Next.js 14, App Router, TypeScript
- Tailwind CSS (dark, editorial aesthetic — think Bloomberg Terminal meets Substack)
- Vercel KV (Redis) for article storage + ratings
- Anthropic API (claude-sonnet) for summarization + relevance scoring
- Vercel Cron for scheduled fetching
- Simple env-var auth for rating UI (no full auth system)

## Project structure
Use the `lib/sources.ts` and `lib/feedback.ts` files I've already written as the foundation.
Build out these remaining files:

### lib/fetcher.ts
- For RSS sources: use a lightweight RSS parser (rss-parser npm package)
- For search_query sources: use News API (newsapi.org) — free tier is fine for now
- For direct_url sources: fetch the page, extract article links / last-modified dates
- Deduplicate by hashing the article URL (use crypto.createHash('md5'))
- Return an array of { url, title, rawContent, source, section, fetchedAt }

### lib/summarizer.ts  
- Takes raw article content + section config
- Calls Anthropic API with the section's summarizerPrompt (composed with feedback addendum)
- Parses the JSON response: { summary, relevance, deadlines, tags }
- Only stores articles where relevance >= RELEVANCE_THRESHOLD (from sources.ts)

### lib/store.ts
- Vercel KV wrapper
- Key schema:
  - `articles:{section}` → sorted set by timestamp
  - `article:{id}` → full article object (summary, relevance, tags, source, url, etc.)
  - `ratings:{section}` → list of ArticleRating objects
  - `addendum:{section}` → latest FeedbackAddendum
- TTL: articles expire after 90 days
- Ratings never expire (needed for feedback loop)

### app/api/cron/refresh/route.ts
- Vercel Cron endpoint (configure in vercel.json for every 8 hours)
- Iterates all sections → fetches → summarizes → stores
- Log counts: fetched, new, stored, filtered-out

### app/api/rate/route.ts
- POST { articleId, section, rating }
- Requires AUTH_SECRET header match (env var)
- Stores the rating alongside the article

### app/api/feedback/tune/route.ts
- POST { section } — triggers the monthly feedback tuning
- Calls generateFeedbackAddendum from feedback.ts
- Stores the new addendum in KV
- Returns the addendum for review

### app/api/feed/[section]/route.ts
- GET — returns paginated articles for a section
- Query params: ?limit=20&offset=0&minRelevance=3

### Frontend pages

#### app/page.tsx (landing)
- Clean, editorial layout
- 4 section cards showing latest 3 headlines each
- Click through to section pages
- Design: dark background option, monospace accents, think "data terminal for healthcare execs"

#### app/[section]/page.tsx (section feed)
- Infinite scroll or paginated list of articles
- Each article card shows: title, summary, source, date, relevance score, tags
- Rating widget (1-5 stars/buttons) — only visible when AUTH_SECRET cookie is set
- Filter by tag, sort by date or relevance

#### app/admin/page.tsx (feedback dashboard)
- Behind AUTH_SECRET
- Shows: rating distribution per section, model vs. user score correlation
- "Tune now" button per section that triggers the feedback endpoint
- Displays current addendum text per section

## vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

## Environment variables needed
- ANTHROPIC_API_KEY
- NEWS_API_KEY (from newsapi.org)
- KV_REST_API_URL (Vercel KV)
- KV_REST_API_TOKEN (Vercel KV)
- AUTH_SECRET (simple password for rating/admin access)

## Design notes
- Public-facing eventually, so make it look good enough to share on LinkedIn
- But start functional — polish comes in iteration 2
- Mobile-responsive from the start
- Each article links to the original source (opens in new tab)
- Attribution line under each summary: "via [source label] · [date] · relevance: [score]/5"

## Build order
1. `lib/fetcher.ts` — get data flowing
2. `lib/summarizer.ts` — Claude integration
3. `lib/store.ts` — persistence
4. `app/api/cron/refresh/route.ts` — test the full pipeline manually
5. Frontend pages — render the data
6. Rating system — the feedback loop
7. `app/admin/page.tsx` — visibility into the system
8. Deploy to Vercel, configure cron + KV + env vars
