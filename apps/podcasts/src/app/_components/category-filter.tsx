"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { css, cx } from "styled-system/css";
import type { Category } from "@/lib/personalities/types";

type CategoryFilterProps = {
  categories: Category[];
  onCategoryChange: (slug: string | null) => void;
  activeCategory: string | null;
};

const categoryIcons: Record<string, string> = {
  "lab-leaders": "\u2726",
  builders: "\u2692",
  researchers: "\u2609",
  hosts: "\u266A",
  "rising-leaders": "\u2197",
  infrastructure: "\u2699",
  "vector-dbs": "\u25C8",
};

const btnBase = css({
  flexShrink: 0,
  rounded: "full",
  px: { base: "3", sm: "3.5" },
  py: "1.5",
  minH: { base: "36px", sm: "40px" },
  fontSize: { base: "xs", sm: "sm" },
  fontWeight: "medium",
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  borderWidth: "1px",
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  transition: "all 200ms var(--ease-smooth)",
});

const btnActive = css({
  borderColor: "accent.purpleBorder",
  bg: "accent.purpleBg",
  color: "accent.purpleLight",
});

const btnInactive = css({
  borderColor: "card.border",
  bg: "transparent",
  color: "ui.dim",
  _hover: {
    borderColor: "whiteAlpha.12",
    bg: "whiteAlpha.6",
    color: "ui.body",
  },
});

const countBadge = css({
  ml: "0.5",
  fontSize: { base: "10px", sm: "xs" },
  fontWeight: "semibold",
  rounded: "full",
  px: "1.5",
  py: "0.5",
  lineHeight: "1",
  minW: "18px",
  textAlign: "center",
});

const countActive = css({
  bg: "accent.purpleGlow",
  color: "accent.purple",
});

const countInactive = css({
  bg: "whiteAlpha.6",
  color: "ui.dim",
  opacity: 0.7,
});

const iconStyle = css({
  fontSize: "0.8em",
  lineHeight: "1",
  opacity: 0.75,
  display: { base: "none", sm: "inline" },
});

export function CategoryFilter({
  categories,
  onCategoryChange,
  activeCategory,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const totalCount = categories.reduce(
    (sum, c) => sum + c.personalities.length,
    0,
  );

  return (
    <div
      className={css({
        pos: "relative",
        maxW: "100%",
      })}
    >
      <div
        ref={scrollRef}
        role="group"
        aria-label="Filter by category"
        className={css({
          display: "flex",
          gap: { base: "1.5", sm: "2" },
          alignItems: "center",
          overflowX: "auto",
          pb: "2",
          maxW: "100%",
          lg: { justifyContent: "center", flexWrap: "wrap", pb: "0" },
        })}
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => onCategoryChange(null)}
          aria-pressed={activeCategory === null}
          className={cx(
            btnBase,
            activeCategory === null ? btnActive : btnInactive,
          )}
        >
          All
          <span className={cx(countBadge, activeCategory === null ? countActive : countInactive)}>
            {totalCount}
          </span>
        </button>

        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onCategoryChange(category.slug)}
            aria-pressed={activeCategory === category.slug}
            className={cx(
              btnBase,
              activeCategory === category.slug ? btnActive : btnInactive,
            )}
          >
            <span className={iconStyle}>
              {categoryIcons[category.slug] ?? "\u25CF"}
            </span>
            {category.title}
            <span
              className={cx(
                countBadge,
                activeCategory === category.slug ? countActive : countInactive,
              )}
            >
              {category.personalities.length}
            </span>
          </button>
        ))}
      </div>

      {/* Left fade mask */}
      <div
        className={css({
          pos: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          w: "40px",
          pointerEvents: "none",
          background: "linear-gradient(to left, transparent, #0B0B0F)",
          transition: "opacity 0.2s ease",
          lg: { display: "none" },
        })}
        style={{ opacity: canScrollLeft ? 1 : 0 }}
        aria-hidden="true"
      />
      {/* Right fade mask */}
      <div
        className={css({
          pos: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          w: "40px",
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent, #0B0B0F)",
          transition: "opacity 0.2s ease",
          lg: { display: "none" },
        })}
        style={{ opacity: canScrollRight ? 1 : 0 }}
        aria-hidden="true"
      />
    </div>
  );
}
