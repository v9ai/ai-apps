"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { css } from "styled-system/css";
import { CategoryFilter } from "./category-filter";
import { StoryGrid } from "./story-grid";
import type { Category, Personality } from "@/lib/personalities/types";

type FilterableGridProps = {
  categories: Category[];
  allPersonalities: Personality[];
  quotes: Record<string, string>;
};

export function FilterableGrid({
  categories,
  allPersonalities,
  quotes,
}: FilterableGridProps) {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get("category"),
  );

  const handleCategoryChange = useCallback((slug: string | null) => {
    setActiveCategory(slug);
    const url = slug ? `/?category=${slug}` : "/";
    window.history.replaceState(null, "", url);
  }, []);

  const filteredPersonalities = useMemo(() => {
    let pool: Category["personalities"];

    if (activeCategory) {
      const cat = categories.find((c) => c.slug === activeCategory);
      pool = cat ? cat.personalities : [];
    } else {
      pool = allPersonalities;
    }

    return pool.filter((p) => p.slug !== "andrej-karpathy");
  }, [activeCategory, allPersonalities, categories]);

  return (
    <>
      {/* -- Category filter pills -- */}
      <div className={css({ mb: { base: "4", md: "5" } })}>
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* -- Story grid -- */}
      {filteredPersonalities.length > 0 ? (
        <StoryGrid personalities={filteredPersonalities} quotes={quotes} />
      ) : (
        /* -- Empty state -- */
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            rounded: "2xl",
            borderWidth: "1px",
            borderColor: "card.border",
            bg: "card.bg",
            p: { base: "10", sm: "12", md: "14" },
            textAlign: "center",
          })}
        >
          {/* Ghost magnifying-glass icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={css({ mb: "6", color: "ui.dark" })}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <p className={css({ color: "ui.dim", fontSize: "base", mb: "3" })}>
            No stories in{" "}
            <span className={css({ color: "accent.purple" })}>
              {categories.find((c) => c.slug === activeCategory)?.title ??
                activeCategory}
            </span>{" "}
            yet.
          </p>

          <button
            onClick={() => handleCategoryChange(null)}
            className={css({
              mt: "6",
              rounded: "md",
              borderWidth: "1px",
              borderColor: "whiteAlpha.8",
              px: "4",
              py: "1.5",
              fontSize: "xs",
              color: "ui.dim",
              transition: "colors",
              _hover: {
                borderColor: "whiteAlpha.13",
                color: "ui.heading",
              },
            })}
          >
            Clear filter
          </button>
        </div>
      )}
    </>
  );
}
