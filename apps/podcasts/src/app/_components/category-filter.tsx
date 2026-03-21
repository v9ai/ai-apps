"use client";

import { css, cx } from "styled-system/css";
import type { Category } from "@/lib/personalities/types";

type CategoryFilterProps = {
  categories: Category[];
  onCategoryChange: (slug: string | null) => void;
  activeCategory: string | null;
};

/* ── icon map: small inline SVGs per category slug ── */
const categoryIcons: Record<string, string> = {
  "lab-leaders": "\u2726",        // sparkle ✦
  builders: "\u2692",             // hammer & pick ⚒
  researchers: "\u2609",          // microscope-like sun ☉ — using atom-like symbol
  hosts: "\u266A",                // music note ♪
  "rising-leaders": "\u2197",     // arrow ↗
  infrastructure: "\u2699",       // gear ⚙
  "vector-dbs": "\u25C8",         // diamond ◈
};

const btnBase = css({
  flexShrink: 0,
  rounded: "full",
  px: { base: "4", sm: "5" },
  py: "2",
  minH: "44px",
  fontSize: "sm",
  fontWeight: "medium",
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  borderWidth: "1px",
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  transition: "all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
});

const btnActive = css({
  borderColor: "rgba(139,92,246,0.30)",
  bg: "rgba(139,92,246,0.13)",
  color: "#c4b5fd",
  boxShadow: "0 0 12px 2px rgba(139,92,246,0.18), 0 0 4px 1px rgba(139,92,246,0.10)",
  transform: "scale(1.04)",
});

const btnInactive = css({
  borderColor: "rgba(255,255,255,0.06)",
  bg: "transparent",
  color: "#7B7B86",
  transform: "scale(1)",
  _hover: {
    borderColor: "rgba(255,255,255,0.12)",
    bg: "rgba(255,255,255,0.06)",
    color: "#C4C4CC",
    transform: "scale(1.02)",
  },
});

const countBadgeActive = css({
  ml: "0.5",
  fontSize: "xs",
  fontWeight: "semibold",
  bg: "rgba(139,92,246,0.22)",
  color: "#a78bfa",
  rounded: "full",
  px: "1.5",
  py: "0.5",
  lineHeight: "1",
  minW: "20px",
  textAlign: "center",
});

const countBadgeInactive = css({
  ml: "0.5",
  fontSize: "xs",
  fontWeight: "semibold",
  bg: "rgba(255,255,255,0.06)",
  color: "#7B7B86",
  rounded: "full",
  px: "1.5",
  py: "0.5",
  lineHeight: "1",
  minW: "20px",
  textAlign: "center",
  opacity: 0.7,
});

const iconStyle = css({
  fontSize: "0.85em",
  lineHeight: "1",
  opacity: 0.75,
});

const dividerDot = css({
  display: { base: "none", md: "flex" },
  alignItems: "center",
  flexShrink: 0,
  color: "rgba(255,255,255,0.12)",
  fontSize: "8px",
  userSelect: "none",
  lineHeight: "1",
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
    <div className={css({ display: "flex", justifyContent: "center", maxW: "100%", overflow: "hidden" })}>
      <div
        className={css({
          rounded: "full",
          borderWidth: "1px",
          borderColor: "rgba(255,255,255,0.08)",
          p: "1.5",
          maxW: "100%",
          overflow: "hidden",
        })}
      >
        <div
          role="group"
          aria-label="Filter by category"
          className={css({
            display: "flex",
            gap: { base: "1.5", sm: "1.5" },
            alignItems: "center",
            overflowX: "auto",
            pb: "1",
            md: { justifyContent: "center", pb: "0" },
          })}
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── "All" pill ── */}
          <button
            onClick={() => onCategoryChange(null)}
            aria-pressed={activeCategory === null}
            className={cx(
              btnBase,
              activeCategory === null ? btnActive : btnInactive,
            )}
          >
            <span className={iconStyle}>&#9670;</span>
            All
            <span
              className={
                activeCategory === null ? countBadgeActive : countBadgeInactive
              }
            >
              {totalCount}
            </span>
          </button>

          {categories.map((category) => (
            <span key={category.slug} className={css({ display: "contents" })}>
              {/* divider dot between pills on desktop */}
              <span className={dividerDot} aria-hidden="true">
                &#9679;
              </span>
              <button
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
                  className={
                    activeCategory === category.slug
                      ? countBadgeActive
                      : countBadgeInactive
                  }
                >
                  {category.personalities.length}
                </span>
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
