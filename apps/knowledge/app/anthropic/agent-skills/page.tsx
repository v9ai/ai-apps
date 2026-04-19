import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { COURSE_TITLE, COURSE_DESCRIPTION, LESSONS } from "./lessons";

export const metadata = {
  title: `${COURSE_TITLE} — Anthropic Academy`,
  description: COURSE_DESCRIPTION,
};

export default function AgentSkillsCoursePage() {
  return (
    <>
      <Topbar />
      <main className="courses-page">
        <div className="courses-page-header">
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginBottom: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--gray-11)",
              textDecoration: "none",
            }}
          >
            ← Go home
          </Link>
          <div style={{ fontSize: "0.875rem", color: "var(--gray-11)", marginBottom: "0.5rem" }}>
            <Link href="/anthropic" style={{ color: "var(--gray-11)" }}>
              Claude Partner Network
            </Link>{" "}
            / Course
          </div>
          <h1 className="courses-page-title">{COURSE_TITLE}</h1>
          <p className="courses-page-subtitle">{COURSE_DESCRIPTION}</p>
        </div>

        <section className="courses-group">
          <div className="courses-group-header">
            <h2 className="courses-group-title">Course Overview</h2>
            <span className="courses-group-count">{LESSONS.length}</span>
          </div>
          <div className="courses-group-grid">
            {LESSONS.map((lesson, i) => (
              <Link
                key={lesson.slug}
                href={`/anthropic/agent-skills/${lesson.slug}`}
                className="course-card"
              >
                <div className="course-card-header">
                  <span className="course-provider-icon">📘</span>
                  <span className="course-provider-name">
                    Lesson {i + 1}
                  </span>
                </div>
                <div className="course-card-title">{lesson.title}</div>
                <p className="course-card-desc">
                  {lesson.objectives[0]}
                </p>
                <div className="course-card-footer">
                  <span className="badge-pill badge-pill--glass">
                    ~{lesson.estimatedMinutes} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
