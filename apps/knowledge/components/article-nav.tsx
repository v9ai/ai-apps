import Link from "next/link";
import type { Paper } from "@/lib/articles";
import { getCategoryMeta } from "@/lib/articles";

interface Props {
  prev: Paper | null;
  next: Paper | null;
}

export function ArticleNav({ prev, next }: Props) {
  if (!prev && !next) return null;

  return (
    <div className="article-nav">
      {prev ? (
        <Link
          href={`/${prev.slug}`}
          className={`article-nav-card cat-${getCategoryMeta(prev.category).slug}`}
        >
          <span className="article-nav-label">&larr; Previous</span>
          <span className="article-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/${next.slug}`}
          className={`article-nav-card article-nav-card--next cat-${getCategoryMeta(next.category).slug}`}
        >
          <span className="article-nav-label">Next &rarr;</span>
          <span className="article-nav-title">{next.title}</span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
