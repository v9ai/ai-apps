"use client";

import type { Category } from "@/lib/personalities/types";

type CategoryFilterProps = {
  categories: Category[];
  onCategoryChange: (slug: string | null) => void;
  activeCategory: string | null;
};

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
      <div
        className="flex gap-2 overflow-x-auto px-1 py-1 md:justify-center [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <button
          onClick={() => onCategoryChange(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeCategory === null
              ? "bg-[#1a1a1a] text-white"
              : "border border-transparent bg-transparent text-neutral-500 hover:border-neutral-200 hover:bg-neutral-100 hover:text-neutral-800"
          }`}
        >
          All <span className="text-neutral-400">({totalCount})</span>
        </button>

        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onCategoryChange(category.slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeCategory === category.slug
                ? "bg-[#1a1a1a] text-white"
                : "border border-transparent bg-transparent text-neutral-500 hover:border-neutral-200 hover:bg-neutral-100 hover:text-neutral-800"
            }`}
          >
            {category.title}{" "}
            <span className="text-neutral-400">
              ({category.personalities.length})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
