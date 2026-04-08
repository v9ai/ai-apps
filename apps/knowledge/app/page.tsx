import Link from "next/link";
import { getGroupedLessons } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { LearningPath } from "@/components/learning-path";
import { Search } from "@/components/search";
import { Footer } from "@/components/footer";
import { ScrollToTop } from "@/components/scroll-to-top";

export default async function HomePage() {
  const groups = await getGroupedLessons();
  const allLessons = groups.flatMap((g) => g.articles);
  const total = allLessons.length;
  const catCount = groups.length;
  const wordCount = allLessons.reduce((sum, l) => sum + l.wordCount, 0);
  const readingHours = Math.round(allLessons.reduce((sum, l) => sum + l.readingTimeMin, 0) / 60);
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <Topbar lessonCount={total} />

      <main id="main-content">
      <Hero lessonCount={total} domainCount={catCount} wordCount={wordCount} readingHours={readingHours} />

      <LearningPath groups={groups} />

      {/* Research Collections */}
      <section className="research-collections" aria-labelledby="research-collections-heading">
        <h2 className="research-collections-title">RESEARCH COLLECTIONS</h2>
        <div className="research-collections-grid">
          <Link href="/kv-quant" className="cat-card" style={{ "--cat-from": "#f59e0b", "--cat-to": "#ef4444" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🗜️</span>
              <span className="cat-card-name">KV-Cache Quantization</span>
            </div>
            <p className="cat-card-desc">Research papers on quantizing key-value caches for efficient LLM inference — compression, pruning, and long-context methods.</p>
          </Link>
        </div>
      </section>

      {/* Interview Prep Resources */}
      <section className="research-collections">
        <h2 className="research-collections-title">INTERVIEW PREP RESOURCES</h2>

        <p style={{ fontSize: 13, color: "var(--gray-9)", marginBottom: 16, lineHeight: 1.5 }}>
          Focused courses for CSS layout challenges and React live-coding interviews.
        </p>

        <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--gray-7)", marginBottom: 12 }}>CSS GRID &amp; FLEXBOX</h3>
        <div className="research-collections-grid" style={{ marginBottom: 24 }}>
          <a href="https://www.udemy.com/course/css-layouts-masterclass/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#3b82f6", "--cat-to": "#8b5cf6", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🎯</span>
              <span className="cat-card-name">CSS Layouts Masterclass</span>
            </div>
            <p className="cat-card-desc">20 layout exercises (e-commerce focused). Practical problem-solving, closest to interview format.</p>
          </a>
          <a href="https://www.udemy.com/course/flexbox-tutorial/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#f59e0b", "--cat-to": "#ef4444", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">📦</span>
              <span className="cat-card-name">Complete Flexbox Course</span>
            </div>
            <p className="cat-card-desc">Flexbox-only deep-dive with 3 mini-projects. Compact and focused drill.</p>
          </a>
          <a href="https://www.udemy.com/course/css-grid/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#10b981", "--cat-to": "#3b82f6", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🔲</span>
              <span className="cat-card-name">Ultimate CSS Grid Course</span>
            </div>
            <p className="cat-card-desc">Grid-only with exercise sheets. Pairs well with the Flexbox course for full coverage.</p>
          </a>
          <a href="https://www.udemy.com/course/css-grid-flexbox-the-ultimate-course-build-10-projects/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#8b5cf6", "--cat-to": "#ec4899", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🏗️</span>
              <span className="cat-card-name">Grid & Flexbox: +10 Projects</span>
            </div>
            <p className="cat-card-desc">10 real-world projects (Airbnb clone, Netflix login). Broadest project variety.</p>
          </a>
          <a href="https://www.udemy.com/course/mastery-of-flexbox-and-css-grid-the-practical-guide/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#06b6d4", "--cat-to": "#3b82f6", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">⚡</span>
              <span className="cat-card-name">Mastery of Flexbox and Grid</span>
            </div>
            <p className="cat-card-desc">Combined 2-in-1 course. No filler — just Grid + Flexbox.</p>
          </a>
          <a href="https://www.udemy.com/course/advanced-css-flexbox-and-grid-2022/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#f43f5e", "--cat-to": "#f59e0b", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">📐</span>
              <span className="cat-card-name">Responsive CSS: Flexbox and Grid</span>
            </div>
            <p className="cat-card-desc">Grid + Flexbox in real-world responsive contexts.</p>
          </a>
          <a href="https://www.udemy.com/course/learn-css-flexbox-from-scratch-with-tons-of-exercises/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#a855f7", "--cat-to": "#6366f1", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">💪</span>
              <span className="cat-card-name">Flexbox: Tons of Exercises</span>
            </div>
            <p className="cat-card-desc">Exercise-heavy format for rapid Flexbox drilling.</p>
          </a>
          <a href="https://www.udemy.com/course/master-responsive-web-design-css-grind-flexbox-animations/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#14b8a6", "--cat-to": "#a855f7", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🎬</span>
              <span className="cat-card-name">Grid, Flexbox & Animations</span>
            </div>
            <p className="cat-card-desc">Also covers CSS animations and transitions for interview polish.</p>
          </a>
        </div>

        <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--gray-7)", marginBottom: 12 }}>REACT INTERVIEW PREP</h3>
        <div className="research-collections-grid">
          <a href="https://www.udemy.com/course/react-interview-questions-coding-interview-2023/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#61dafb", "--cat-to": "#3b82f6", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">⚛️</span>
              <span className="cat-card-name">React Coding Interview 2026</span>
            </div>
            <p className="cat-card-desc">41 real interview questions with step-by-step solutions + TypeScript. Closest to open-ended challenge format.</p>
          </a>
          <a href="https://www.udemy.com/course/react-interview/" target="_blank" rel="noopener noreferrer" className="cat-card" style={{ "--cat-from": "#3b82f6", "--cat-to": "#14b8a6", textDecoration: "none" } as React.CSSProperties}>
            <div className="cat-card-header">
              <span className="cat-card-icon">🧠</span>
              <span className="cat-card-name">React Interview Masterclass</span>
            </div>
            <p className="cat-card-desc">Top 200 questions. Deep coverage of hooks (useReducer, useCallback, useMemo, useRef) + TypeScript patterns.</p>
          </a>
        </div>
      </section>

      {/* Search + Bento Grid */}
      <div id="lessons">
        <Search groups={groups} />
      </div>

      </main>
      <Footer />
    </>
  );
}
