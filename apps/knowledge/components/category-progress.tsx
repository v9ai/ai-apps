import Link from "next/link";
import type { Paper } from "@/lib/articles";

interface Props {
  categoryPapers: Paper[];
  currentSlug: string;
  categoryName: string;
}

export function CategoryProgress({ categoryPapers, currentSlug, categoryName }: Props) {
  const currentIndex = categoryPapers.findIndex((p) => p.slug === currentSlug);
  if (currentIndex === -1) return null;

  return (
    <div className="category-progress">
      <span className="category-progress-label">
        Lesson {currentIndex + 1} of {categoryPapers.length} in {categoryName}
      </span>
      <div className="category-progress-dots">
        {categoryPapers.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className={`category-progress-dot${p.slug === currentSlug ? " category-progress-dot--current" : ""}`}
            title={p.title}
          />
        ))}
      </div>
    </div>
  );
}
