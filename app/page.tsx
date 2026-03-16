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

function RelevanceBadge({ score }: { score: number }) {
  const cls = score >= 5 ? "badge-5" : score >= 4 ? "badge-4" : "badge-3";
  return <span className={cls}>{score}/5</span>;
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
      <section className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Value-Based Care Intelligence
        </h1>
        <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
          AI-curated news and policy updates across ACO programs, risk
          adjustment, quality measures, AI in healthcare, and earnings
          intelligence. Refreshed weekly.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sectionData.map(({ config, articles }) => (
          <Link
            key={config.id}
            href={`/${config.id}`}
            className="card group block"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                {config.name}
              </h2>
              {articles.length > 0 && (
                <span className="text-xs text-gray-400">
                  {articles.length} recent
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              {config.description}
            </p>

            {articles.length > 0 ? (
              <ul className="space-y-3">
                {articles.map((article) => (
                  <li key={article.id} className="flex items-start gap-3">
                    <RelevanceBadge score={article.relevance} />
                    <div className="min-w-0">
                      <span className="text-sm text-gray-800 leading-snug line-clamp-2">
                        {article.title}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {article.source}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                Awaiting first fetch
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100">
              <span className="text-sm font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
                View all &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
