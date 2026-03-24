import type { GroupedLessons } from "@/lib/articles";

interface Props {
  groups: GroupedLessons[];
}

export function LearningPath({ groups }: Props) {
  return (
    <div className="learning-path">
      <div className="learning-path-title">Learning Path</div>
      <div className="learning-path-track">
        {groups.map((g, i) => {
          const totalMin = g.articles.reduce((sum, a) => sum + a.readingTimeMin, 0);
          return (
            <a
              key={g.category}
              href={`#cat-${g.meta.slug}`}
              className={`learning-path-node cat-${g.meta.slug}`}
            >
              <span className="learning-path-icon">{g.meta.icon}</span>
              <span className="learning-path-name">{g.category}</span>
              <span className="learning-path-meta">
                {g.articles.length} lessons &middot; {totalMin}m
              </span>
              {i < groups.length - 1 && (
                <span className="learning-path-arrow" />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
