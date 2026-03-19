"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import type { Paper, GroupedPapers } from "@/lib/articles";

/** Last category gets span-3 (full width) */
function cardClass(index: number, total: number): string {
  if (index === total - 1) return "cat-card cat-card--full";
  return "cat-card";
}

function ArticleCard({ article }: { article: Paper }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "";
  }, []);

  return (
    <Link
      ref={ref}
      href={`/${article.slug}`}
      className="article-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <span className="article-card-num">
        {String(article.number).padStart(2, "0")}
      </span>
      <span className="article-card-title">{article.title}</span>
      <span className="article-card-time">{article.readingTimeMin} min</span>
      <span className="article-card-arrow">&rarr;</span>
    </Link>
  );
}

interface Props {
  groups: GroupedPapers[];
}

export function CategoryGrid({ groups }: Props) {
  const totalPapers = groups.reduce((sum, g) => sum + g.articles.length, 0);

  return (
    <>
      {/* Section heading */}
      <div className="research-section-header">
        <span className="research-section-kicker">Research Foundation</span>
        <h2 className="research-section-title">
          Backed by {totalPapers}+ Research Papers
        </h2>
        <p className="research-section-subtitle">
          Every algorithm and scoring model is grounded in peer-reviewed research
          across {groups.length} AI/ML domains.
        </p>
      </div>

      {/* Quick-nav pills */}
      <div className="cat-nav">
        {groups.map((g) => (
          <button
            key={g.category}
            className={`cat-nav-pill cat-${g.meta.slug}`}
            onClick={() => {
              document.getElementById(`cat-${g.meta.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="cat-nav-icon">{g.meta.icon}</span>
            {g.category}
            <span className="cat-nav-count">{g.articles.length}</span>
          </button>
        ))}
      </div>

      {/* Bento grid of category cards */}
      <div className="bento-grid">
        {groups.map((group, i) => (
          <div
            key={group.category}
            id={`cat-${group.meta.slug}`}
            className={`${cardClass(i, groups.length)} cat-${group.meta.slug}`}
          >
            {/* Gradient border overlay */}
            <span className="cat-card-border" aria-hidden="true" />
            <div className="cat-card-icon">{group.meta.icon}</div>
            <div className="cat-card-header">
              <span className="cat-card-name">{group.category}</span>
              <span className="cat-card-count-badge">
                {group.articles.length}
              </span>
            </div>
            <div className="cat-card-desc">{group.meta.description}</div>
            {group.articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
            <div className="cat-card-footer">
              {Math.round(group.articles.reduce((sum, a) => sum + a.readingTimeMin, 0))} min total reading
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
