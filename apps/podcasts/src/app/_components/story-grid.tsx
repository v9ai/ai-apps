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
          borderTopColor: "rgba(255,255,255,0.06)",
          pt: { base: "3", md: "4" },
        })}
      >
        {/* -- Story count -- */}
        <p
          className={css({
            fontSize: "xs",
            fontWeight: "400",
            letterSpacing: "0.04em",
            color: "#7B7B86",
            mb: { base: "3", md: "4" },
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
              base: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
              xl: "repeat(4, 1fr)",
            },
            gap: { base: "3", sm: "4", lg: "5" },
            alignItems: "start",
          })}
          role="list"
        >
          {personalities.map((p, i) => (
            <div
              key={p.slug}
              role="listitem"
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
          bottom: "8",
          right: "8",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          w: "10",
          h: "10",
          rounded: "full",
          bg: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          borderWidth: "1px",
          borderColor: "rgba(255,255,255,0.1)",
          color: "#8A8A95",
          cursor: "pointer",
          transition: "all 0.25s ease",
          opacity: 0,
          pointerEvents: "none",
          transform: "translateY(8px)",
          _hover: {
            bg: "rgba(255,255,255,0.14)",
            color: "#E8E8ED",
            borderColor: "rgba(255,255,255,0.18)",
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
