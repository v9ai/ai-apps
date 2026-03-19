"use client";

import { useState } from "react";
import Link from "next/link";
import type { Paper, GroupedPapers } from "@/lib/articles";

function PaperRow({ paper }: { paper: Paper }) {
  return (
    <Link href={`/${paper.slug}`} className="paper-row">
      <span className="paper-row-num">
        {String(paper.number).padStart(2, "0")}
      </span>
      <div className="paper-row-body">
        <span className="paper-row-title">{paper.title}</span>
        <div className="paper-row-meta">
          <span className="paper-row-domain">{paper.category}</span>
          <span className="paper-row-time">{paper.readingTimeMin} min read</span>
        </div>
      </div>
      <span className="paper-row-arrow">&rarr;</span>
    </Link>
  );
}

export function PaperList({ groups }: { groups: GroupedPapers[] }) {
  const [filter, setFilter] = useState("");
  const query = filter.toLowerCase();

  const filtered = groups
    .map((g) => ({
      ...g,
      articles: g.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query) ||
          String(a.number).includes(query)
      ),
    }))
    .filter((g) => g.articles.length > 0);

  const totalResults = filtered.reduce((sum, g) => sum + g.articles.length, 0);

  return (
    <div className="paper-list">
      <div className="yc-search" style={{ padding: "12px 12px 0" }}>
        <input
          type="text"
          placeholder="Search papers by title, category, or number..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <span className="yc-search-count">{totalResults} result{totalResults !== 1 ? "s" : ""}</span>
        )}
      </div>
      {filtered.map((group) => {
        const slug = group.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return (
          <div key={group.category} className="paper-list-group">
            <div
              id={`cat-${slug}`}
              className={`paper-list-category-header cat-${slug}`}
            >
              <span className="paper-list-category-icon">{group.meta.icon}</span>
              <span className="paper-list-category-name">{group.category}</span>
              <span className="paper-list-category-count">{group.articles.length}</span>
            </div>
            {group.articles.map((paper) => (
              <PaperRow key={paper.slug} paper={paper} />
            ))}
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="no-results">
          No papers match &ldquo;{filter}&rdquo;
        </div>
      )}
    </div>
  );
}
