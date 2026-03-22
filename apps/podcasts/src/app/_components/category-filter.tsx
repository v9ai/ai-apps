"use client";

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
  borderColor: "rgba(139,92,246,0.25)",
  bg: "rgba(139,92,246,0.10)",
  color: "#c4b5fd",
});

const btnInactive = css({
  borderColor: "rgba(255,255,255,0.06)",
  bg: "transparent",
  color: "#7B7B86",
  _hover: {
    borderColor: "rgba(255,255,255,0.12)",
    bg: "rgba(255,255,255,0.06)",
    color: "#C4C4CC",
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
  bg: "rgba(139,92,246,0.22)",
  color: "#a78bfa",
});

const countInactive = css({
  bg: "rgba(255,255,255,0.06)",
  color: "#7B7B86",
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

      {/* Mobile fade mask */}
      <div
        className={css({
          pos: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          w: "40px",
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent, #0B0B0F)",
          lg: { display: "none" },
        })}
        aria-hidden="true"
      />
    </div>
  );
}
