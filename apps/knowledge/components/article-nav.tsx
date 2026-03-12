import Link from "next/link";
import type { Lesson } from "@/lib/articles";
import { getCategoryMeta } from "@/lib/articles";

interface Props {
  prev: Lesson | null;
  next: Lesson | null;
  currentCategory?: string;
}

export function ArticleNav({ prev, next, currentCategory }: Props) {
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
          {currentCategory && prev.category !== currentCategory && (
            <span className="article-nav-transition">
              From: {getCategoryMeta(prev.category).icon} {prev.category}
            </span>
          )}
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
          {currentCategory && next.category !== currentCategory && (
            <span className="article-nav-transition">
              Up next: {getCategoryMeta(next.category).icon} {next.category}
            </span>
          )}
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
