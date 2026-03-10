"use client";

import { useState } from "react";
import Link from "next/link";
import type { Paper, GroupedPapers } from "@/lib/articles";

function PaperRow({ paper }: { paper: Paper }) {
  return (
    <Link href={`/${paper.slug}`} className="yc-row">
      <span className="yc-badge yc-badge--accent">
        {String(paper.number).padStart(2, "0")}
      </span>
      <span className="yc-row-title">{paper.title}</span>
      <span className="yc-category-pill">{paper.category}</span>
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

  return (
    <div>
      <div className="yc-search" style={{ padding: "12px 12px 0" }}>
        <input
          type="text"
          placeholder="Search papers by title, category, or number..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {filtered.map((group) => {
        const slug = group.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        return (
        <div key={group.category}>
          <div id={`cat-${slug}`} className="category-header" style={{ scrollMarginTop: 60 }}>{group.category}</div>
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
