import Link from "next/link";
import type { Paper, CategoryMeta } from "@/lib/articles";

interface Props {
  papers: Paper[];
  meta: CategoryMeta;
}

export function RelatedPapers({ papers, meta }: Props) {
  if (papers.length === 0) return null;

  return (
    <div className="related-section">
      <div className="related-heading">Continue Learning</div>
      <div className="related-grid">
        {papers.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className={`related-card cat-${meta.slug}`}
          >
            <span className="related-card-num">
              #{String(p.number).padStart(2, "0")}
            </span>
            <span className="related-card-title">{p.title}</span>
            <div className="related-card-meta">
              <span className="badge-pill badge-pill--glass">
                ~{p.readingTimeMin} min
              </span>
              <span className="badge-pill badge-pill--category">
                {meta.icon} {p.category}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
