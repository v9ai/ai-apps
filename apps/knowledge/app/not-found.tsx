import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { getAllLessons } from "@/lib/data";

export default async function NotFound() {
  const allLessons = await getAllLessons();

  return (
    <div>
      <Topbar lessonCount={allLessons.length} />
      <div className="article-banner" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
        <div className="article-banner-inner" style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <h1 className="article-banner-title" style={{ fontSize: "2rem" }}>
            Topic not available yet
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.1rem", margin: "1rem 0 2rem" }}>
            This topic hasn&apos;t been added to the curriculum yet. Check back soon or explore the existing lessons.
          </p>
          <Link
            href="/#lessons"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-sm, 6px)",
              background: "var(--accent, teal)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Browse all lessons
          </Link>
        </div>
      </div>
    </div>
  );
}
