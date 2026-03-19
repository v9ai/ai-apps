"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractHeadings(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      entries.push({ level, text, id: slugify(text) });
    }
  }
  return entries;
}

function TocNav({
  headings,
  activeId,
  onSelect,
  activeRef,
}: {
  headings: TocEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  activeRef?: React.RefObject<HTMLAnchorElement | null>;
}) {
  const activeIndex = headings.findIndex((h) => h.id === activeId);
  const progress = headings.length > 1
    ? Math.round((Math.max(0, activeIndex) / (headings.length - 1)) * 100)
    : 0;

  return (
    <nav>
      <div
        className="toc-progress-track"
        aria-hidden="true"
      >
        <div
          className="toc-progress-fill"
          style={{ height: `${progress}%` }}
        />
      </div>
      {headings.map((h, i) => {
        const isActive = activeId === h.id;
        const isPast = activeIndex >= 0 && i < activeIndex;
        const classes = [
          h.level === 3 ? "toc-h3" : undefined,
          isActive ? "toc-active" : undefined,
          isPast ? "toc-past" : undefined,
        ]
          .filter(Boolean)
          .join(" ") || undefined;

        return (
          <a
            key={`${h.id}-${i}`}
            href={`#${h.id}`}
            className={classes}
            ref={isActive ? activeRef : undefined}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                onSelect(h.id);
              }
            }}
          >
            {h.text}
          </a>
        );
      })}
    </nav>
  );
}

export function TableOfContents({ markdown }: { markdown: string }) {
  const headings = extractHeadings(markdown);
  const [activeId, setActiveId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the sidebar to keep the active item in view
  const scrollActiveIntoView = useCallback(() => {
    if (activeItemRef.current && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const item = activeItemRef.current;
      const sidebarRect = sidebar.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (
        itemRect.top < sidebarRect.top + 40 ||
        itemRect.bottom > sidebarRect.bottom - 40
      ) {
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const visibleHeadings = new Map<string, IntersectionObserverEntry>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleHeadings.set(entry.target.id, entry);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        }
        if (visibleHeadings.size > 0) {
          let topEntry: IntersectionObserverEntry | null = null;
          for (const entry of visibleHeadings.values()) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
          if (topEntry) {
            setActiveId(topEntry.target.id);
            requestAnimationFrame(scrollActiveIntoView);
          }
        }
      },
      { rootMargin: "-60px 0px -70% 0px", threshold: 0 }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observerRef.current.observe(el);
    }

    return () => { observerRef.current?.disconnect(); };
  }, [headings, scrollActiveIntoView]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (headings.length === 0) return null;

  const handleSelect = (id: string) => {
    setActiveId(id);
    setDrawerOpen(false);
  };

  const activeIndex = headings.findIndex((h) => h.id === activeId);
  const sectionLabel = activeIndex >= 0
    ? `${activeIndex + 1}/${headings.length}`
    : "";

  return (
    <>
      {/* Desktop TOC */}
      <div className="toc-sidebar" ref={sidebarRef}>
        <div className="toc-sidebar-header">
          <div className="toc-sidebar-title">On this page</div>
          {sectionLabel && (
            <span className="toc-sidebar-count">{sectionLabel}</span>
          )}
        </div>
        <TocNav
          headings={headings}
          activeId={activeId}
          onSelect={handleSelect}
          activeRef={activeItemRef}
        />
      </div>

      {/* Mobile TOC trigger + drawer */}
      <button
        className="toc-mobile-trigger"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open table of contents"
      >
        <span className="toc-mobile-trigger-icon">&#9776;</span>
        Contents
        {sectionLabel && (
          <span className="toc-mobile-trigger-count">{sectionLabel}</span>
        )}
      </button>

      {drawerOpen && (
        <div
          className="toc-mobile-backdrop toc-mobile-backdrop--open"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div className={`toc-mobile-drawer ${drawerOpen ? "toc-mobile-drawer--open" : ""}`}>
        <div className="toc-mobile-drawer-handle" />
        <div className="toc-mobile-drawer-header">
          <div className="toc-sidebar-title">On this page</div>
          <button
            className="toc-mobile-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close table of contents"
          >
            &times;
          </button>
        </div>
        <TocNav headings={headings} activeId={activeId} onSelect={handleSelect} />
      </div>
    </>
  );
}
