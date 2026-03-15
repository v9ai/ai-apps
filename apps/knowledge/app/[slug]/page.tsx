import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllLessons, getLessonBySlug, getCategoryMeta, getReferencesForLesson, getRelatedLessons, getAudioMeta } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { MarkdownProse } from "@/components/markdown-prose";
import { TableOfContents } from "@/components/toc";
import { ReadingProgress } from "@/components/reading-progress";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ArticleNav } from "@/components/article-nav";
import { CategoryProgress } from "@/components/category-progress";
import { RelatedLessons } from "@/components/related-lessons";
import { PageAnalytics } from "@/components/page-analytics";
import { AudioPlayer } from "@/components/audio-player";

export async function generateStaticParams() {
  const lessons = await getAllLessons();
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  return { title: lesson ? `${lesson.title} — AI Engineering` : "Not Found" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  const allLessons = await getAllLessons();
  const total = allLessons.length;
  const meta = getCategoryMeta(lesson.category);
  const references = await getReferencesForLesson(slug);
  const related = await getRelatedLessons(slug);
  const audioMeta = await getAudioMeta(lesson.fileSlug);

  // Same-category lessons for progress indicator
  const categoryLessons = allLessons.filter((l) => l.category === lesson.category);

  // Prev/next
  const idx = allLessons.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  return (
    <div className={`cat-${meta.slug}${audioMeta ? " has-audio-player" : ""}`}>
      <ReadingProgress />
      <Topbar lessonCount={total} />

      {/* Banner */}
      <div className="article-banner">
        <div className="article-banner-inner">
          <div className="article-banner-breadcrumb">
            <Link href="/">&larr; all lessons</Link>
            <span className="sep">/</span>
            <span>{meta.icon} {lesson.category}</span>
            <span className="sep">/</span>
            <span>#{String(lesson.number).padStart(2, "0")}</span>
          </div>
          <CategoryProgress
            categoryLessons={categoryLessons}
            currentSlug={slug}
            categoryName={lesson.category}
          />
          <h1 className="article-banner-title">{lesson.title}</h1>
          <div className="article-banner-badges">
            <span className="badge-pill badge-pill--category">
              {meta.icon} {lesson.category}
            </span>
            <span className="badge-pill badge-pill--glass">
              ~{lesson.readingTimeMin} min read
            </span>
            {audioMeta && (
              <span className="badge-pill badge-pill--glass">
                ~{Math.round(audioMeta.duration_secs / 60)} min listen
              </span>
            )}
            {references.length > 0 && (
              <span className="badge-pill badge-pill--glass">
                {references.length} reference{references.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="article-grid">
        <div>
          <MarkdownProse content={lesson.content} />

          {/* Go Deeper — optional references for further study */}
          {references.length > 0 && (
            <div className="sources-section">
              <div className="sources-heading">Go Deeper</div>
              <p className="sources-intro">Want to understand the foundations? These references are a great next step.</p>
              {references.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-card"
                >
                  <div className="source-card-title">{ref.title}</div>
                  <div className="source-card-meta">
                    {ref.authors && <span>{ref.authors}</span>}
                    {ref.year && <span>&middot; {ref.year}</span>}
                    {ref.venue && (
                      <span className="source-card-venue">{ref.venue}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Continue Learning */}
          <RelatedLessons lessons={related} meta={meta} />

          {/* Prev/Next */}
          <ArticleNav prev={prev} next={next} currentCategory={lesson.category} />
        </div>
        <TableOfContents markdown={lesson.content} />
      </div>

      <PageAnalytics lessonSlug={slug} />
      {audioMeta && <AudioPlayer meta={audioMeta} />}
      <ScrollToTop />
    </div>
  );
}
