"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lesson, GroupedLessons } from "@/lib/articles";

/** Fill incomplete last row: if 1 leftover → full-width, if 2 → last spans 2 */
function cardClass(index: number, total: number): string {
  const remainder = total % 3;
  if (remainder === 1 && index === total - 1) return "cat-card cat-card--full";
  if (remainder === 2 && index === total - 1) return "cat-card cat-card--wide";
  return "cat-card";
}

function LessonCard({ lesson, isFirst }: { lesson: Lesson; isFirst?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // Skip 3D tilt for users who prefer reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "";
  }, []);

  return (
    <Link
      ref={ref}
      href={lesson.url}
      className="article-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="article-card-top">
        <span className="article-card-num">
          {String(lesson.number).padStart(2, "0")}
        </span>
        {isFirst && <span className="article-card-start">Start here</span>}
        <span className="article-card-title">{lesson.title}</span>
        <span className={`article-card-level article-card-level--${lesson.difficulty}`}>
          {lesson.difficulty === "beginner" ? "Beginner" : lesson.difficulty === "intermediate" ? "Mid" : "Adv"}
        </span>
        <span className="article-card-time">{lesson.readingTimeMin}m</span>
        <span className="article-card-arrow">&rarr;</span>
      </div>
      {lesson.excerpt && (
        <span className="article-card-excerpt">{lesson.excerpt}</span>
      )}
    </Link>
  );
}

function DifficultyBar({ articles }: { articles: Lesson[] }) {
  const total = articles.length;
  const beginner = articles.filter((a) => a.difficulty === "beginner").length;
  const intermediate = articles.filter((a) => a.difficulty === "intermediate").length;
  const advanced = total - beginner - intermediate;
  return (
    <span className="difficulty-bar" title={`${beginner} beginner, ${intermediate} intermediate, ${advanced} advanced`}>
      {beginner > 0 && (
        <span
          className="difficulty-bar-seg difficulty-bar-seg--beginner"
          style={{ flex: beginner }}
        />
      )}
      {intermediate > 0 && (
        <span
          className="difficulty-bar-seg difficulty-bar-seg--intermediate"
          style={{ flex: intermediate }}
        />
      )}
      {advanced > 0 && (
        <span
          className="difficulty-bar-seg difficulty-bar-seg--advanced"
          style={{ flex: advanced }}
        />
      )}
    </span>
  );
}

interface Props {
  groups: GroupedLessons[];
}

export function CategoryGrid({ groups }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [focusedPillIndex, setFocusedPillIndex] = useState(0);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* Track which category sections have been scrolled past (for learning-path visited state) */
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = groups.map((g) => `cat-${g.meta.slug}`);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = entry.target.id;
            setActiveSlug(slug);

            /* Broadcast active category to topbar */
            const group = groups.find((g) => `cat-${g.meta.slug}` === slug);
            if (group) {
              window.dispatchEvent(
                new CustomEvent("active-category-change", {
                  detail: { icon: group.meta.icon, name: group.category },
                }),
              );
            }

            /* Mark all categories above the current one as visited */
            setVisitedSlugs((prev) => {
              const idx = ids.indexOf(slug);
              if (idx <= 0) return prev;
              const next = new Set(prev);
              for (let i = 0; i < idx; i++) next.add(ids[i]);
              return next;
            });
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [groups]);

  /* Clear the active category broadcast when unmounting or when no section is visible */
  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("active-category-change", { detail: null }),
      );
    };
  }, []);

  return (
    <>
      <nav
        className="cat-nav"
        aria-label="Category navigation"
        role="toolbar"
        onKeyDown={(e) => {
          const len = groups.length;
          let next = focusedPillIndex;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            next = (focusedPillIndex + 1) % len;
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            next = (focusedPillIndex - 1 + len) % len;
          } else if (e.key === "Home") {
            e.preventDefault();
            next = 0;
          } else if (e.key === "End") {
            e.preventDefault();
            next = len - 1;
          } else {
            return;
          }
          setFocusedPillIndex(next);
          pillRefs.current[next]?.focus();
        }}
      >
        {groups.map((g, i) => {
          const slug = `cat-${g.meta.slug}`;
          const isActive = activeSlug === slug;
          const isVisited = visitedSlugs.has(slug);
          return (
            <button
              key={g.category}
              ref={(el) => { pillRefs.current[i] = el; }}
              tabIndex={i === focusedPillIndex ? 0 : -1}
              className={`cat-nav-pill cat-${g.meta.slug}${isActive ? " cat-nav-pill--active" : ""}${isVisited && !isActive ? " cat-nav-pill--visited" : ""}`}
              aria-pressed={isActive}
              onFocus={() => setFocusedPillIndex(i)}
              onClick={() => {
                document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="cat-nav-icon">{g.meta.icon}</span>
              <span className="cat-nav-label">{g.category}</span>
              <span className="cat-nav-count">{g.articles.length}</span>
            </button>
          );
        })}
      </nav>

      <div className="bento-grid">
        {groups.map((group, i) => (
          <div
            key={group.category}
            id={`cat-${group.meta.slug}`}
            className={`${cardClass(i, groups.length)} cat-${group.meta.slug}`}
          >
            <div className="cat-card-icon">{group.meta.icon}</div>
            <div className="cat-card-header">
              <span className="cat-card-name">{group.category}</span>
              <span className="cat-card-count">
                {group.articles.length} lesson{group.articles.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="cat-card-desc">{group.meta.description}</div>
            {group.meta.outcomes && group.meta.outcomes.length > 0 && (
              <ul className="cat-card-outcomes">
                {group.meta.outcomes.map((o, k) => (
                  <li key={k}>{o}</li>
                ))}
              </ul>
            )}
            <div className="cat-card-divider">
              <span className="cat-card-divider-label">Lessons</span>
            </div>
            {group.articles.map((lesson, j) => (
              <LessonCard key={lesson.slug} lesson={lesson} isFirst={j === 0} />
            ))}
            <div className="cat-card-footer">
              <span className="cat-card-footer-time">
                {Math.round(group.articles.reduce((sum, a) => sum + a.readingTimeMin, 0))} min total
              </span>
              <DifficultyBar articles={group.articles} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
