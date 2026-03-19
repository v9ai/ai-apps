import Link from "next/link";
import type { Paper } from "@/lib/articles";
import { getCategoryMeta } from "@/lib/articles";

interface Props {
  prev: Paper | null;
  next: Paper | null;
  current?: number;
  total?: number;
}

export function ArticleNav({ prev, next, current, total }: Props) {
  if (!prev && !next) return null;

  const showProgress = current !== undefined && total !== undefined && total > 0;

  return (
    <div className="article-nav">
      {showProgress && (
        <div className="article-nav-progress">
          <div className="article-nav-progress-bar">
            <div
              className="article-nav-progress-fill"
              style={{ width: `${Math.round((current / total) * 100)}%` }}
            />
          </div>
          <span className="article-nav-progress-text">
            {current} of {total} papers
          </span>
        </div>
      )}
      <div className="article-nav-cards">
        {prev ? (
          <Link
            href={`/${prev.slug}`}
            className={`article-nav-card cat-${getCategoryMeta(prev.category).slug}`}
          >
            <span className="article-nav-label">
              <span className="article-nav-arrow article-nav-arrow--left">&larr;</span>
              Previous
            </span>
            <span className="article-nav-title">{prev.title}</span>
            <span className="article-nav-meta">
              <span className="article-nav-cat">
                {getCategoryMeta(prev.category).icon} {prev.category}
              </span>
              <span className="article-nav-time">~{prev.readingTimeMin} min</span>
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/${next.slug}`}
            className={`article-nav-card article-nav-card--next cat-${getCategoryMeta(next.category).slug}`}
          >
            <span className="article-nav-label">
              Next
              <span className="article-nav-arrow article-nav-arrow--right">&rarr;</span>
            </span>
            <span className="article-nav-title">{next.title}</span>
            <span className="article-nav-meta">
              <span className="article-nav-cat">
                {getCategoryMeta(next.category).icon} {next.category}
              </span>
              <span className="article-nav-time">~{next.readingTimeMin} min</span>
            </span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
