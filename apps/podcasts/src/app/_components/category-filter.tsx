"use client";

import type { Category } from "@/lib/personalities/types";

type CategoryFilterProps = {
  categories: Category[];
  onCategoryChange: (slug: string | null) => void;
  activeCategory: string | null;
};

const btnBase =
  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium tracking-[0.01em] transition-all duration-200 cursor-pointer border";
const btnActive =
  "border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.10)] text-ink-primary";
const btnInactive =
  "border-[rgba(255,255,255,0.06)] bg-transparent text-ink-muted hover:border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.06)] hover:text-ink-secondary";

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
    <div className="flex justify-center">
      <div className="rounded-full border border-[rgba(255,255,255,0.04)] p-1">
        <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center">
          <button
            onClick={() => onCategoryChange(null)}
            className={`${btnBase} ${activeCategory === null ? btnActive : btnInactive}`}
          >
            All{" "}
            <span
              className={
                activeCategory === null ? "text-ink-tertiary" : "text-ink-muted"
              }
            >
              ({totalCount})
            </span>
          </button>

          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => onCategoryChange(category.slug)}
              className={`${btnBase} ${activeCategory === category.slug ? btnActive : btnInactive}`}
            >
              {category.title}{" "}
              <span
                className={
                  activeCategory === category.slug
                    ? "text-ink-tertiary"
                    : "text-ink-muted"
                }
              >
                ({category.personalities.length})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
