import Link from "next/link";
import { Topbar } from "@/components/topbar";

export const metadata = {
  title: "Claude Partner Network — Learning Path",
  description:
    "Introductory foundation to the Claude Partner Network — the first step toward unlocking certification.",
};

type Course = {
  title: string;
  description: string;
  url: string;
  icon: string;
  internal?: boolean;
};

type Finisher = {
  rank: number;
  name: string;
  completedAt: string;
  url?: string;
};

const FINISHERS: Finisher[] = [
  { rank: 1, name: "Lucas Valbuena", completedAt: "Apr 19, 2026" },
  {
    rank: 2,
    name: "Jonatas Soares",
    completedAt: "Apr 19, 2026",
    url: "http://jonatassoares.com",
  },
];

const COURSES: Course[] = [
  {
    title: "Introduction to agent skills",
    description:
      "Learn how to build, configure, and share Skills in Claude Code — reusable markdown instructions that Claude automatically applies to the right tasks at the right time. This course takes you from creating your first Skill to distributing them across teams and troubleshooting common issues.",
    url: "/anthropic/agent-skills",
    icon: "🧩",
    internal: true,
  },
  {
    title: "Building with the Claude API",
    description:
      "This comprehensive course covers the full spectrum of working with Anthropic models using the Claude API — requests, tools, RAG, MCP, prompt caching, and agent workflows.",
    url: "/anthropic/claude-api",
    icon: "🔌",
    internal: true,
  },
  {
    title: "Introduction to Model Context Protocol",
    description:
      "Learn to build Model Context Protocol servers and clients from scratch using Python. Master MCP's three core primitives — tools, resources, and prompts — to connect Claude with external services.",
    url: "https://anthropic.skilljar.com/introduction-to-model-context-protocol",
    icon: "🔗",
  },
  {
    title: "Claude Code in Action",
    description: "Integrate Claude Code into your development workflow.",
    url: "https://anthropic.skilljar.com/claude-code-in-action",
    icon: "⚡",
  },
];

function CourseCard({ course }: { course: Course }) {
  const inner = (
    <>
      <div className="course-card-header">
        <span className="course-provider-icon">{course.icon}</span>
        <span className="course-provider-name">Anthropic Academy</span>
      </div>
      <div className="course-card-title">{course.title}</div>
      <p className="course-card-desc">{course.description}</p>
    </>
  );
  if (course.internal) {
    return (
      <Link href={course.url} className="course-card">
        {inner}
      </Link>
    );
  }
  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="course-card"
    >
      {inner}
    </a>
  );
}

function FinisherCard({ finisher }: { finisher: Finisher }) {
  const inner = (
    <>
      <div className="course-card-header">
        <span className="course-provider-icon">{finisher.rank}</span>
        <span className="course-provider-name">{finisher.completedAt}</span>
      </div>
      <div className="course-card-title">{finisher.name}</div>
      <p className="course-card-desc">Completed all 4 courses</p>
    </>
  );
  if (finisher.url) {
    return (
      <a
        href={finisher.url}
        target="_blank"
        rel="noopener noreferrer"
        className="course-card"
      >
        {inner}
      </a>
    );
  }
  return <div className="course-card">{inner}</div>;
}

export default function AnthropicLearningPathPage() {
  return (
    <>
      <Topbar />
      <main className="courses-page">
        <div className="courses-page-header">
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--gray-11)",
              textDecoration: "none",
            }}
          >
            ← Go home
          </Link>
          <h1 className="courses-page-title">
            Claude Partner Network Learning Path
          </h1>
          <p className="courses-page-subtitle">
            Welcome to the Claude Partner Network. This learning path is
            designed as an introductory foundation and the first step toward
            unlocking certification.
          </p>
        </div>

        <section className="courses-group">
          <div className="courses-group-header">
            <h2 className="courses-group-title">Courses</h2>
            <span className="courses-group-count">{COURSES.length}</span>
          </div>
          <div className="courses-group-grid">
            {COURSES.map((c) => (
              <CourseCard key={c.title} course={c} />
            ))}
          </div>
        </section>

        <section className="courses-group">
          <div className="courses-group-header">
            <h2 className="courses-group-title">🏆 Finishers</h2>
            <span className="courses-group-count">{FINISHERS.length}</span>
          </div>
          <div className="courses-group-grid">
            {FINISHERS.map((f) => (
              <FinisherCard key={f.rank} finisher={f} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
