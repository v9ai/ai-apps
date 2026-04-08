import { Topbar } from "@/components/topbar";
import { getAllUdemyCoursesByGroup, TOPIC_GROUP_ORDER } from "@/lib/db/queries";
import { CoursesShell } from "./courses-shell";

export const metadata = {
  title: "Courses — Knowledge",
  description: "Curated courses on CSS, React, TypeScript, design systems, generative AI, RAG, deep learning, MLOps, and more — grouped by topic.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const grouped = await getAllUdemyCoursesByGroup();

  const orderedGroups = [
    ...TOPIC_GROUP_ORDER.filter((g) => grouped[g]?.length),
    ...Object.keys(grouped).filter(
      (g) => !TOPIC_GROUP_ORDER.includes(g as never) && grouped[g]?.length,
    ),
  ];

  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  const groups = orderedGroups.map((name) => ({
    name,
    courses: grouped[name],
  }));

  return (
    <>
      <Topbar />
      <main className="courses-page">
        {groups.length === 0 ? (
          <p style={{ color: "var(--gray-9)", fontSize: "0.875rem", padding: "2rem" }}>
            No courses yet — run <code>pnpm scrape:udemy</code> to populate.
          </p>
        ) : (
          <CoursesShell groups={groups} total={total} />
        )}
      </main>
    </>
  );
}
