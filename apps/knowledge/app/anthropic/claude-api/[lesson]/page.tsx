import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { MarkdownProse } from "@/components/markdown-prose";
import { COURSE_TITLE, LESSONS } from "../lessons";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: slug } = await params;
  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) return { title: "Lesson not found" };
  return {
    title: `${lesson.title} — ${COURSE_TITLE}`,
    description: lesson.objectives[0],
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: slug } = await params;
  const idx = LESSONS.findIndex((l) => l.slug === slug);
  if (idx === -1) notFound();
  const lesson = LESSONS[idx];
  const prev = idx > 0 ? LESSONS[idx - 1] : null;
  const next = idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null;

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
            /{" "}
            <Link href="/anthropic/claude-api" style={{ color: "var(--gray-11)" }}>
              {COURSE_TITLE}
            </Link>
          </div>
          <h1 className="courses-page-title">{lesson.title}</h1>
        </div>

        <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid var(--gray-5)",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
              background: "var(--gray-2)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>What you'll learn</div>
            <div style={{ fontSize: "0.875rem", color: "var(--gray-11)", marginBottom: "0.5rem" }}>
              Estimated time: {lesson.estimatedMinutes} minutes
            </div>
            <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              By the end of this lesson you'll be able to:
            </div>
            <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
              {lesson.objectives.map((o) => (
                <li key={o} style={{ marginBottom: "0.25rem" }}>{o}</li>
              ))}
            </ul>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            {lesson.title}
          </h2>
          <div style={{ fontSize: "0.875rem", color: "var(--gray-11)", marginBottom: "1rem" }}>
            ({lesson.videoMinutes} minutes)
          </div>
          <p style={{ marginBottom: "1.5rem" }}>{lesson.videoIntro}</p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Key takeaways
          </h3>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "2rem" }}>
            {lesson.keyTakeaways.map((t, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}>{t}</li>
            ))}
          </ul>

          <MarkdownProse content={lesson.body} />

          <div
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid var(--gray-5)",
              borderRadius: "0.5rem",
              marginTop: "2rem",
              background: "var(--gray-2)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Lesson reflection</div>
            <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
              {lesson.reflection.map((r) => (
                <li key={r} style={{ marginBottom: "0.5rem" }}>{r}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>What's next</div>
            <p style={{ margin: 0 }}>{lesson.whatsNext}</p>
          </div>

          <nav
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--gray-5)",
            }}
          >
            {prev ? (
              <Link
                href={`/anthropic/claude-api/${prev.slug}`}
                style={{ textDecoration: "none", color: "var(--gray-12)" }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--gray-11)" }}>← Previous</div>
                <div style={{ fontWeight: 600 }}>{prev.title}</div>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/anthropic/claude-api/${next.slug}`}
                style={{ textDecoration: "none", color: "var(--gray-12)", textAlign: "right" }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--gray-11)" }}>Next →</div>
                <div style={{ fontWeight: 600 }}>{next.title}</div>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      </main>
    </>
  );
}
