"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { ExternalCourse } from "@/lib/db/queries";

/* ── Star rating ─────────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="course-stars" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const type = i < full ? "full" : i === full && half ? "half" : "empty";
        return <span key={i} className={`course-star course-star--${type}`}>★</span>;
      })}
    </span>
  );
}

/* ── Course card ─────────────────────────────────────────────── */
function CourseCard({ course }: { course: ExternalCourse }) {
  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="course-card"
    >
      <div className="course-card-header">
        <span className="course-provider-icon">📚</span>
        <span className="course-provider-name">Udemy</span>
        {course.isFree && <span className="badge-pill badge-pill--free">Free</span>}
      </div>

      <div className="course-card-title">{course.title}</div>

      {course.description && (
        <p className="course-card-desc">{course.description}</p>
      )}

      <div className="course-card-footer">
        {course.rating != null && (
          <span className="course-rating">
            <StarRating rating={course.rating} />
            <span className="course-rating-num">{course.rating.toFixed(1)}</span>
            {course.reviewCount != null && (
              <span className="course-review-count">
                ({course.reviewCount.toLocaleString()})
              </span>
            )}
          </span>
        )}
        <div className="course-card-badges">
          {course.level && (
            <span className={`badge-pill badge-pill--level badge-pill--${course.level.toLowerCase()}`}>
              {course.level}
            </span>
          )}
          {course.durationHours != null && (
            <span className="badge-pill badge-pill--glass">
              ~{course.durationHours < 10
                ? `${course.durationHours}h`
                : `${Math.round(course.durationHours)}h`}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

/* ── Course group section ────────────────────────────────────── */
function CourseGroup({
  id,
  name,
  courses,
}: {
  id: string;
  name: string;
  courses: ExternalCourse[];
}) {
  return (
    <section id={id} className="courses-group">
      <div className="courses-group-header">
        <h2 className="courses-group-title">{name}</h2>
        <span className="courses-group-count">{courses.length} courses</span>
      </div>
      <div className="courses-group-grid">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  );
}

/* ── Slug helper ─────────────────────────────────────────────── */
function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ── Main shell (client) ─────────────────────────────────────── */
export function CoursesShell({
  groups,
  total,
}: {
  groups: { name: string; courses: ExternalCourse[] }[];
  total: number;
}) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsRef = useRef<HTMLElement>(null);
  const isScrolling = useRef(false);

  /* Observe which section is in view */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
    );

    for (const el of sectionRefs.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [groups]);

  /* Scroll active tab pill into view within the nav */
  useEffect(() => {
    if (!activeTab || !tabsRef.current) return;
    const btn = tabsRef.current.querySelector<HTMLButtonElement>(
      `[data-tab="${activeTab}"]`,
    );
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  const handleTabClick = useCallback((slug: string) => {
    setActiveTab(slug);
    const el = sectionRefs.current.get(slug);
    if (!el) return;
    isScrolling.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => {
      isScrolling.current = false;
    }, 800);
  }, []);

  const refCallback = useCallback(
    (slug: string) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(slug, el);
      else sectionRefs.current.delete(slug);
    },
    [],
  );

  return (
    <>
      {/* ── Sticky tab bar ─────────────────────────────────────── */}
      <nav ref={tabsRef} className="courses-tabs">
        <div className="courses-tabs-inner">
          {groups.map((g) => {
            const slug = slugify(g.name);
            return (
              <button
                key={slug}
                data-tab={slug}
                className={`courses-tab${activeTab === slug ? " courses-tab--active" : ""}`}
                onClick={() => handleTabClick(slug)}
              >
                {g.name}
                <span className="courses-tab-count">{g.courses.length}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Page body ──────────────────────────────────────────── */}
      <div className="courses-body">
        <div className="courses-page-header">
          <h1 className="courses-page-title">AI / ML Courses</h1>
          <p className="courses-page-subtitle">
            {total} courses across {groups.length} topics — curated from Udemy
          </p>
        </div>

        {groups.map((g) => {
          const slug = slugify(g.name);
          return (
            <div key={slug} ref={refCallback(slug)}>
              <CourseGroup id={slug} name={g.name} courses={g.courses} />
            </div>
          );
        })}
      </div>
    </>
  );
}
