"use client";

import { useEffect, useState } from "react";
import type { GroupedLessons } from "@/lib/articles";

interface Props {
  groups: GroupedLessons[];
}

export function LearningPath({ groups }: Props) {
  const [visitedCats, setVisitedCats] = useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = useState<string>("");

  /* Poll the body data attribute set by CategoryGrid for visited state */
  useEffect(() => {
    function onCategoryChange(e: CustomEvent<{ icon: string; name: string } | null>) {
      if (e.detail) {
        const group = groups.find((g) => g.category === e.detail!.name);
        if (group) setActiveCat(`cat-${group.meta.slug}`);
      } else {
        setActiveCat("");
      }
    }
    window.addEventListener("active-category-change", onCategoryChange as EventListener);
    return () => window.removeEventListener("active-category-change", onCategoryChange as EventListener);
  }, [groups]);

  /* Watch body data-visited-cats attribute */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const raw = document.body.dataset.visitedCats;
      if (raw) {
        setVisitedCats(new Set(raw.split(",").filter(Boolean)));
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-visited-cats"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="learning-path">
      <div className="learning-path-title">Learning Path</div>
      <div className="learning-path-track">
        {groups.map((g, i) => {
          const slug = `cat-${g.meta.slug}`;
          const totalMin = g.articles.reduce((sum, a) => sum + a.readingTimeMin, 0);
          const isVisited = visitedCats.has(slug);
          const isActive = activeCat === slug;
          return (
            <a
              key={g.category}
              href={`#${slug}`}
              className={`learning-path-node cat-${g.meta.slug}${isVisited ? " learning-path-node--visited" : ""}${isActive ? " learning-path-node--active" : ""}`}
            >
              <span className="learning-path-icon">{g.meta.icon}</span>
              <span className="learning-path-name">{g.category}</span>
              <span className="learning-path-meta">
                {g.articles.length} lessons &middot; {totalMin}m
              </span>
              {isVisited && <span className="learning-path-check" aria-label="Visited" />}
              {i < groups.length - 1 && (
                <span className={`learning-path-arrow${isVisited ? " learning-path-arrow--done" : ""}`} />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
