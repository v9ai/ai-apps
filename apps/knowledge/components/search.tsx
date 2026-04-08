"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { GroupedLessons, DifficultyLevel } from "@/lib/articles";
import type { SearchResult } from "@/lib/data";
import { searchContent } from "@/lib/actions/search";
import { deepSearch, type DeepSearchResult } from "@/lib/actions/deep-search";
import { CategoryGrid } from "./category-grid";

function highlightSnippet(snippet: string) {
  const parts = snippet.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
  );
}

function typeBadgeLabel(type: SearchResult["resultType"]) {
  switch (type) {
    case "lesson":
      return "Lesson";
    case "section":
      return "Section";
}
}

interface Props {
  groups: GroupedLessons[];
}

const DIFFICULTY_FILTERS: { value: DifficultyLevel | "all"; label: string }[] = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function Search({ groups }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [diffFilter, setDiffFilter] = useState<DifficultyLevel | "all">("all");
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lessonLookup = useMemo(() => {
    const map = new Map<string, { category: string; icon: string; catSlug: string; difficulty: string; url: string }>();
    for (const g of groups) {
      for (const a of g.articles) {
        map.set(a.slug, { category: g.category, icon: g.meta.icon, catSlug: g.meta.slug, difficulty: a.difficulty, url: a.url });
      }
    }
    return map;
  }, [groups]);

  const totalLessons = useMemo(
    () => groups.reduce((sum, g) => sum + g.articles.length, 0),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    if (diffFilter === "all") return groups;
    return groups
      .map((g) => ({
        ...g,
        articles: g.articles.filter((a) => a.difficulty === diffFilter),
      }))
      .filter((g) => g.articles.length > 0);
  }, [groups, diffFilter]);

  // Cmd+K / Ctrl+K to focus
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchMs(null);
      return;
    }
    setSearching(true);
    setSearchMs(null);
    const t0 = performance.now();
    const res = isDeepSearch
      ? await deepSearch(trimmed)
      : await searchContent(trimmed);
    setSearchMs(Math.round(performance.now() - t0));
    setResults(res);
    setSearching(false);
  }, [isDeepSearch]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      <div className={`yc-search${isFocused ? " yc-search--focused" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          aria-label="Search lessons"
          placeholder={isDeepSearch ? "Semantic search across all content..." : "Search lessons, topics, concepts..."}
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (query.length > 0) {
                setQuery("");
                setResults([]);
                clearTimeout(timerRef.current);
              }
              inputRef.current?.blur();
            }
          }}
        />
        <div className="yc-search-controls">
          <div className="yc-search-toggle" role="radiogroup" aria-label="Search mode">
            <button
              className={`yc-search-toggle-btn${!isDeepSearch ? " yc-search-toggle-btn--active" : ""}`}
              role="radio"
              aria-checked={!isDeepSearch}
              onClick={() => {
                if (isDeepSearch) {
                  setIsDeepSearch(false);
                  if (query.trim().length >= 2) {
                    clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => doSearch(query), 100);
                  }
                }
              }}
            >
              Keyword
            </button>
            <button
              className={`yc-search-toggle-btn${isDeepSearch ? " yc-search-toggle-btn--active" : ""}`}
              role="radio"
              aria-checked={isDeepSearch}
              onClick={() => {
                if (!isDeepSearch) {
                  setIsDeepSearch(true);
                  if (query.trim().length >= 2) {
                    clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => doSearch(query), 100);
                  }
                }
              }}
            >
              AI Semantic
            </button>
          </div>
          {hasQuery && results.length > 0 && (
            <span className="yc-search-count">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          )}
          {!hasQuery && !isFocused && <kbd className="yc-search-kbd">&#8984;K</kbd>}
          {query.length > 0 && (
            <button className="yc-search-clear" aria-label="Clear search" onClick={handleClear}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!hasQuery && (
        <div className="difficulty-filter">
          {DIFFICULTY_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`difficulty-filter-btn${f.value !== "all" ? ` difficulty-filter-btn--${f.value}` : ""}${diffFilter === f.value ? " difficulty-filter-btn--active" : ""}`}
              aria-pressed={diffFilter === f.value}
              onClick={() => setDiffFilter(f.value)}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="difficulty-filter-count">
                  {groups.reduce((sum, g) => sum + g.articles.filter((a) => a.difficulty === f.value).length, 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {hasQuery ? (
        <div className="search-results" aria-live="polite">
          {searching && results.length === 0 && (
            <div className="search-loading">
              <div className="search-loading-bar search-loading-bar--wide" />
              <div className="search-loading-bar" />
              <div className="search-loading-bar search-loading-bar--narrow" />
              <div className="search-loading-bar" />
            </div>
          )}
          {searching && results.length > 0 && (
            <div className="search-refreshing">
              <div className="search-refreshing-bar" />
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="no-results" role="status">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-title">No results found</div>
              <div className="no-results-hint">
                {!isDeepSearch
                  ? "No keyword matches — try AI Semantic search for conceptual queries"
                  : "Try different keywords or a shorter query"}
              </div>
              {!isDeepSearch && (
                <button
                  className="no-results-switch"
                  onClick={() => {
                    setIsDeepSearch(true);
                    clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => doSearch(query), 100);
                  }}
                >
                  Switch to AI Semantic
                </button>
              )}
              <button className="no-results-clear" onClick={handleClear}>
                Clear search
              </button>
            </div>
          )}
          {results.map((r, i) => {
            const meta = r.lessonSlug ? lessonLookup.get(r.lessonSlug) : undefined;
            return (
              <Link
                key={`${r.resultType}-${r.title}-${i}`}
                href={meta?.url ?? `/${r.lessonSlug}`}
                className={`search-result-card${meta ? ` cat-${meta.catSlug}` : ""}${searching ? " search-result-card--stale" : ""}`}
              >
                <div className="search-result-meta">
                  <span className="badge-pill badge-pill--glass search-result-type">
                    {typeBadgeLabel(r.resultType)}
                  </span>
                  {meta && (
                    <span className="badge-pill badge-pill--category search-result-cat">
                      {meta.icon} {meta.category}
                    </span>
                  )}
                  {meta && (
                    <span className={`article-card-level article-card-level--${meta.difficulty}`}>
                      {meta.difficulty === "beginner" ? "Beginner" : meta.difficulty === "intermediate" ? "Mid" : "Adv"}
                    </span>
                  )}
                  {isDeepSearch && "similarity" in r && (r as DeepSearchResult).similarity > 0 && (
                    <span className="search-result-similarity">
                      {((r as DeepSearchResult).similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="search-result-title">{r.title}</div>
                <div className="search-result-snippet">
                  {highlightSnippet(r.snippet)}
                </div>
                {r.resultType !== "lesson" && r.lessonTitle && (
                  <div className="search-result-lesson">{r.lessonTitle}</div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <CategoryGrid groups={filteredGroups} />
      )}
    </>
  );
}
