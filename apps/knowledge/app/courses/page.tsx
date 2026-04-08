import { Topbar } from "@/components/topbar";
import { getAllUdemyCoursesByGroup, TOPIC_GROUP_ORDER } from "@/lib/db/queries";
import type { ExternalCourse } from "@/lib/db/queries";

export const metadata = {
  title: "Courses — Knowledge",
  description: "Curated courses on CSS, React, TypeScript, design systems, generative AI, RAG, deep learning, MLOps, and more — grouped by topic.",
};

export const dynamic = "force-dynamic";

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

function CourseCard({ course }: { course: ExternalCourse }) {
  const meta = (course.metadata ?? {}) as Record<string, unknown>;
  const instructors = Array.isArray(meta.instructors) ? meta.instructors as string[] : [];
  const instructor = instructors[0] ?? null;
  const isBestseller = (course.rating ?? 0) >= 4.5 && (course.reviewCount ?? 0) >= 1000;

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="course-card"
    >
      {/* Thumbnail */}
      <div className="course-card-thumb">
        {course.imageUrl ? (
          <img src={course.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="course-card-thumb-fallback" />
        )}
      </div>

      {/* Body */}
      <div className="course-card-body">
        <h3 className="course-card-title">{course.title}</h3>

        {instructor && (
          <p className="course-card-instructor">{instructor}</p>
        )}

        {course.rating != null && (
          <div className="course-rating">
            <span className="course-rating-num">{course.rating.toFixed(1)}</span>
            <StarRating rating={course.rating} />
            {course.reviewCount != null && (
              <span className="course-review-count">
                ({course.reviewCount.toLocaleString()})
              </span>
            )}
          </div>
        )}

        <div className="course-card-price-row">
          {course.isFree ? (
            <span className="course-price course-price--free">Free</span>
          ) : (
            <span className="course-price">Paid</span>
          )}
          {course.durationHours != null && (
            <span className="course-card-duration">
              {course.durationHours < 10
                ? `${course.durationHours}h total`
                : `${Math.round(course.durationHours)}h total`}
            </span>
          )}
        </div>

        <div className="course-card-meta-row">
          {isBestseller && (
            <span className="course-badge-bestseller">Bestseller</span>
          )}
          {course.enrolled != null && course.enrolled > 0 && (
            <span className="course-card-enrolled">
              {course.enrolled.toLocaleString()} students
            </span>
          )}
          {course.level && (
            <span className={`course-badge-level course-badge-level--${course.level.toLowerCase()}`}>
              {course.level}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function CourseGroup({ name, courses }: { name: string; courses: ExternalCourse[] }) {
  return (
    <section className="courses-group">
      <div className="courses-group-header">
        <h2 className="courses-group-title">{name}</h2>
        <span className="courses-group-count">{courses.length}</span>
      </div>
      <div className="courses-group-grid">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </section>
  );
}

export default async function CoursesPage() {
  const grouped = await getAllUdemyCoursesByGroup();

  const orderedGroups = [
    ...TOPIC_GROUP_ORDER.filter((g) => grouped[g]?.length),
    ...Object.keys(grouped).filter((g) => !TOPIC_GROUP_ORDER.includes(g as never) && grouped[g]?.length),
  ];

  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <>
      <Topbar />
      <main className="courses-page">
        <div className="courses-page-header">
          <h1 className="courses-page-title">Courses</h1>
          <p className="courses-page-subtitle">
            {total} courses across {orderedGroups.length} groups
          </p>
        </div>

        {orderedGroups.length === 0 ? (
          <p style={{ color: "var(--gray-9)", fontSize: "0.875rem" }}>
            No courses yet — run <code>pnpm scrape:udemy</code> to populate.
          </p>
        ) : (
          orderedGroups.map((group) => (
            <CourseGroup key={group} name={group} courses={grouped[group]} />
          ))
        )}
      </main>
    </>
  );
}
