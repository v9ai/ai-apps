"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { GroupedPapers } from "@/lib/articles";
import type { SearchResult } from "@/lib/data";
import { searchContent } from "@/lib/actions/search";
import { CategoryGrid } from "./category-grid";

function highlightSnippet(snippet: string) {
  const parts = snippet.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
  );
}

function typeBadgeLabel(type: SearchResult["resultType"]) {
  switch (type) {
    case "paper":
      return "Paper";
    case "section":
      return "Section";
    case "citation":
      return "Citation";
  }
}

interface Props {
  groups: GroupedPapers[];
}

export function Search({ groups }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      return;
    }
    setSearching(true);
    const res = await searchContent(trimmed);
    setResults(res);
    setSearching(false);
  }, []);

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
      <div className="yc-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search papers, sections, citations..."
          value={query}
          onChange={handleChange}
        />
        {!hasQuery && <span className="yc-search-hint">⌘K</span>}
        {hasQuery && results.length > 0 && (
          <span className="yc-search-count">{results.length}</span>
        )}
        {query.length > 0 && (
          <button className="yc-search-clear" onClick={handleClear}>
            ✕
          </button>
        )}
      </div>

      {hasQuery ? (
        <div className="search-results">
          {searching && results.length === 0 && (
            <div className="search-loading">
              <div className="search-loading-bar" />
              <div className="search-loading-bar" />
              <div className="search-loading-bar" />
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-title">No results found</div>
              <div className="no-results-hint">
                Try different keywords or shorter queries
              </div>
              <button className="no-results-clear" onClick={handleClear}>
                Clear search
              </button>
            </div>
          )}
          {results.map((r, i) => (
            <Link
              key={`${r.resultType}-${r.title}-${i}`}
              href={
                r.resultType === "citation"
                  ? `/${r.paperSlug}`
                  : `/${r.paperSlug}`
              }
              className="search-result-card"
            >
              <div className="search-result-header">
                <span className="badge-pill badge-pill--glass search-result-type">
                  {typeBadgeLabel(r.resultType)}
                </span>
                <span className="search-result-title">{r.title}</span>
              </div>
              <div className="search-result-snippet">
                {highlightSnippet(r.snippet)}
              </div>
              {r.resultType !== "paper" && r.paperTitle && (
                <div className="search-result-paper">{r.paperTitle}</div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <CategoryGrid groups={groups} />
      )}
    </>
  );
}
