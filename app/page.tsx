import Link from "next/link";
import { SECTIONS } from "@/lib/sources";
import { getArticles } from "@/lib/store";
import type { Section } from "@/lib/sources";
import type { SummarizedArticle } from "@/lib/summarizer";

export const dynamic = "force-dynamic";

async function getLatestArticles(
  section: Section
): Promise<SummarizedArticle[]> {
  try {
    return await getArticles(section, { limit: 3 });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const sectionData = await Promise.all(
    SECTIONS.map(async (s) => ({
      config: s,
      articles: await getLatestArticles(s.id),
    }))
  );

  return (
    <div>
      <section className="mb-12">
        <h1 className="font-mono text-2xl md:text-3xl font-bold mb-2">
          <span className="text-terminal-accent">&gt;</span> Value-Based Care
          Intelligence
        </h1>
        <p className="text-terminal-muted font-mono text-sm max-w-2xl">
          AI-curated news and policy updates across ACO programs, risk
          adjustment, quality measures, AI in healthcare, and earnings
          intelligence. Curated with Claude-powered relevance
          scoring. Refreshed weekly.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionData.map(({ config, articles }) => (
          <Link
            key={config.id}
            href={`/${config.id}`}
            className="card group block"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-mono text-base font-bold text-terminal-text group-hover:text-terminal-accent transition-colors">
                {config.name}
              </h2>
              <span className="text-xs font-mono text-terminal-muted">
                {articles.length > 0
                  ? `${articles.length} recent`
                  : "No articles yet"}
              </span>
            </div>

            <p className="text-xs text-terminal-muted mb-4 leading-relaxed">
              {config.description}
            </p>

            {articles.length > 0 ? (
              <ul className="space-y-2">
                {articles.map((article) => (
                  <li
                    key={article.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-terminal-accent mt-0.5 shrink-0">
                      &bull;
                    </span>
                    <div className="min-w-0">
                      <span className="text-terminal-text line-clamp-1">
                        {article.title}
                      </span>
                      <span className="text-xs text-terminal-muted font-mono">
                        via {article.source} &middot; rel:{article.relevance}/5
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-terminal-muted text-xs font-mono">
                Awaiting first fetch cycle
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-terminal-border">
              <span className="text-xs font-mono text-terminal-accent group-hover:underline">
                View all &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
