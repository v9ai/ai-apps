import type { ExternalCourse } from "@/lib/db/queries";

type CourseWithReview = ExternalCourse & {
  review?: {
    aggregateScore: number | null;
    verdict: string | null;
  } | null;
};

interface Props {
  courses: CourseWithReview[];
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const frac = rating - full;
  return (
    <span className="course-stars" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="course-star course-star--full">&#9733;</span>;
        if (i === full && frac >= 0.25) {
          const pct = Math.round(frac * 100);
          return (
            <span key={i} className="course-star course-star--partial" style={{ "--fill": `${pct}%` } as React.CSSProperties}>
              &#9733;
            </span>
          );
        }
        return <span key={i} className="course-star course-star--empty">&#9733;</span>;
      })}
    </span>
  );
}

export function ExternalCourses({ courses }: Props) {
  if (courses.length === 0) return null;

  return (
    <div className="courses-section">
      <div className="related-heading">Further Learning</div>
      <div className="courses-grid">
        {courses.map((c) => {
          const meta = (c.metadata ?? {}) as Record<string, unknown>;
          const instructors = Array.isArray(meta.instructors) ? meta.instructors as string[] : [];
          const instructor = instructors[0] ?? null;

          return (
            <a
              key={c.id}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="course-card"
            >
              <div className="course-card-thumb">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt="" loading="lazy" />
                ) : (
                  <div className="course-card-thumb-fallback" />
                )}
              </div>

              <div className="course-card-body">
                <h3 className="course-card-title">{c.title}</h3>

                {instructor && (
                  <p className="course-card-instructor">{instructor}</p>
                )}

                {c.rating != null && (
                  <div className="course-rating">
                    <span className="course-rating-num">{c.rating.toFixed(1)}</span>
                    <StarRating rating={c.rating} />
                    {c.reviewCount != null && (
                      <span className="course-review-count">
                        ({c.reviewCount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}

                <div className="course-card-price-row">
                  {c.isFree ? (
                    <span className="course-price course-price--free">Free</span>
                  ) : (
                    <span className="course-price">Paid</span>
                  )}
                  {c.durationHours != null && (
                    <span className="course-card-duration">
                      {c.durationHours < 10
                        ? `${c.durationHours}h total`
                        : `${Math.round(c.durationHours)}h total`}
                    </span>
                  )}
                </div>

                {c.level && (
                  <div className="course-card-meta-row">
                    <span className={`course-badge-level course-badge-level--${c.level.toLowerCase()}`}>
                      {c.level}
                    </span>
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
