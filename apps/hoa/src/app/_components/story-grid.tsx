"use client";

import { useEffect, useState, useRef } from "react";
import type { Personality } from "@/lib/personalities/types";
import { css, cx } from "styled-system/css";
import { StoryCard } from "./story-card";

type StoryGridProps = {
  personalities: Personality[];
  quotes: Record<string, string>;
};

export function StoryGrid({ personalities, quotes }: StoryGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      setShowScrollTop(rect.top < -200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={gridRef}
      className={cx("animate-fade-in")}
    >
      {/* -- Subtle top border for visual separation from filters -- */}
      <div
        className={css({
          borderTopWidth: "1px",
          borderTopColor: "card.border",
          pt: { base: "3", sm: "3.5", md: "4" },
        })}
      >
        {/* -- Story count -- */}
        <p
          className={css({
            fontSize: "xs",
            fontWeight: "400",
            letterSpacing: "0.04em",
            color: "ui.dim",
            mb: { base: "3", sm: "3.5", md: "4" },
          })}
        >
          Showing {personalities.length}{" "}
          {personalities.length === 1 ? "story" : "stories"}
        </p>

        {/* -- Grid -- */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: {
              base: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(4, 1fr)",
            },
            gap: { base: "2.5", sm: "3", md: "3.5", lg: "4" },
            alignItems: "start",
          })}
          role="list"
        >
          {personalities.map((p, i) => (
            <div
              key={p.slug}
              role="listitem"
              className={css({ minW: 0 })}
            >
              <StoryCard
                personality={p}
                quote={quotes[p.slug]}
                variant="default"
                index={i}
              />
            </div>
          ))}
        </div>
      </div>

      {/* -- Scroll-to-top floating button -- */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
        className={css({
          position: "fixed",
          bottom: { base: "4", md: "8" },
          right: { base: "4", md: "8" },
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          w: "10",
          h: "10",
          rounded: "full",
          bg: "whiteAlpha.8",
          backdropFilter: "blur(12px)",
          borderWidth: "1px",
          borderColor: "whiteAlpha.10",
          color: "ui.tertiary",
          cursor: "pointer",
          transition: "all 0.25s ease",
          opacity: 0,
          pointerEvents: "none",
          transform: "translateY(8px)",
          _hover: {
            bg: "whiteAlpha.13",
            color: "ui.heading",
            borderColor: "whiteAlpha.18",
          },
        })}
        style={
          showScrollTop
            ? { opacity: 1, pointerEvents: "auto", transform: "translateY(0)" }
            : undefined
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}
