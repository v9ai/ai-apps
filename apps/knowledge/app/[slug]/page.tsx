import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPapers, getPaperBySlug, getCategoryMeta, getCitationsForPaper, getRelatedPapers, getAudioMeta } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { MarkdownProse } from "@/components/markdown-prose";
import { TableOfContents } from "@/components/toc";
import { ReadingProgress } from "@/components/reading-progress";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ArticleNav } from "@/components/article-nav";
import { CategoryProgress } from "@/components/category-progress";
import { RelatedPapers } from "@/components/related-papers";
import { PageAnalytics } from "@/components/page-analytics";
import { AudioPlayer } from "@/components/audio-player";

export async function generateStaticParams() {
  const papers = await getAllPapers();
  return papers.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  return { title: paper ? `${paper.title} — AI Engineering` : "Not Found" };
}

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = await getPaperBySlug(slug);
  if (!paper) notFound();

  const allPapers = await getAllPapers();
  const total = allPapers.length;
  const meta = getCategoryMeta(paper.category);
  const papers = await getCitationsForPaper(slug);
  const related = await getRelatedPapers(slug);
  const audioMeta = await getAudioMeta(slug);

  // Same-category papers for progress indicator
  const categoryPapers = allPapers.filter((a) => a.category === paper.category);

  // Prev/next
  const idx = allPapers.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? allPapers[idx - 1] : null;
  const next = idx < allPapers.length - 1 ? allPapers[idx + 1] : null;

  return (
    <div className={`cat-${meta.slug}${audioMeta ? " has-audio-player" : ""}`}>
      <ReadingProgress />
      <Topbar paperCount={total} />

      {/* Banner */}
      <div className="article-banner">
        <div className="article-banner-inner">
          <div className="article-banner-breadcrumb">
            <Link href="/">&larr; all lessons</Link>
            <span className="sep">/</span>
            <span>{meta.icon} {paper.category}</span>
            <span className="sep">/</span>
            <span>#{String(paper.number).padStart(2, "0")}</span>
          </div>
          <CategoryProgress
            categoryPapers={categoryPapers}
            currentSlug={slug}
            categoryName={paper.category}
          />
          <h1 className="article-banner-title">{paper.title}</h1>
          <div className="article-banner-badges">
            <span className="badge-pill badge-pill--category">
              {meta.icon} {paper.category}
            </span>
            <span className="badge-pill badge-pill--glass">
              ~{paper.readingTimeMin} min read
            </span>
            {audioMeta && (
              <span className="badge-pill badge-pill--glass">
                ~{Math.round(audioMeta.duration_secs / 60)} min listen
              </span>
            )}
            {papers.length > 0 && (
              <span className="badge-pill badge-pill--glass">
                {papers.length} reference{papers.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="article-grid">
        <div>
          <MarkdownProse content={paper.content} />

          {/* Go Deeper — optional references for further study */}
          {papers.length > 0 && (
            <div className="sources-section">
              <div className="sources-heading">Go Deeper</div>
              <p className="sources-intro">Want to understand the foundations? These references are a great next step.</p>
              {papers.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-card"
                >
                  <div className="source-card-title">{p.title}</div>
                  <div className="source-card-meta">
                    {p.authors && <span>{p.authors}</span>}
                    {p.year && <span>&middot; {p.year}</span>}
                    {p.venue && (
                      <span className="source-card-venue">{p.venue}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Continue Learning */}
          <RelatedPapers papers={related} meta={meta} />

          {/* Prev/Next */}
          <ArticleNav prev={prev} next={next} currentCategory={paper.category} />
        </div>
        <TableOfContents markdown={paper.content} />
      </div>

      <PageAnalytics paperSlug={slug} />
      {audioMeta && <AudioPlayer meta={audioMeta} />}
      <ScrollToTop />
    </div>
  );
}
