import Link from "next/link";
import { getGroupedLessons } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { LearningPath } from "@/components/learning-path";
import { Search } from "@/components/search";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/scroll-reveal";

export default async function HomePage() {
  const groups = await getGroupedLessons();
  const allLessons = groups.flatMap((g) => g.articles);
  const total = allLessons.length;
  const catCount = groups.length;
  const wordCount = allLessons.reduce((sum, l) => sum + l.wordCount, 0);
  const readingHours = Math.round(allLessons.reduce((sum, l) => sum + l.readingTimeMin, 0) / 60);
  return (
    <div>
      <a href="#lessons" className="skip-link">Skip to lessons</a>
      <Topbar lessonCount={total} />

      <Hero lessonCount={total} domainCount={catCount} wordCount={wordCount} readingHours={readingHours} />

      <ScrollReveal>
        <LearningPath groups={groups} />
      </ScrollReveal>

      <main>
        {/* Research Collections */}
        <ScrollReveal delay={100}>
          <section className="research-collections">
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
        </ScrollReveal>

        {/* Search + Bento Grid */}
        <div id="lessons">
          <Search groups={groups} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
