import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPapers, getPaperBySlug, getCategoryMeta } from "@/lib/articles";
import { getPapersForSlug } from "@/lib/papers";
import { Topbar } from "@/components/topbar";
import { MarkdownProse } from "@/components/markdown-prose";
import { TableOfContents } from "@/components/toc";
import { ReadingProgress } from "@/components/reading-progress";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ArticleNav } from "@/components/article-nav";

export function generateStaticParams() {
  return getAllPapers().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = getPaperBySlug(slug);
  return { title: paper ? `${paper.title} — RE AI Research` : "Not Found" };
}

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = getPaperBySlug(slug);
  if (!paper) notFound();

  const allPapers = getAllPapers();
  const total = allPapers.length;
  const meta = getCategoryMeta(paper.category);
  const papers = getPapersForSlug(slug);

  // Prev/next
  const idx = allPapers.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? allPapers[idx - 1] : null;
  const next = idx < allPapers.length - 1 ? allPapers[idx + 1] : null;

  return (
    <div className={`cat-${meta.slug}`}>
      <ReadingProgress showPercentage />
      <Topbar />

      {/* Banner */}
      <div className="article-banner">
        <div className="article-banner-inner">
          <div className="article-banner-breadcrumb">
            <Link href="/">&larr; all papers</Link>
            <span className="sep">/</span>
            <span>{meta.icon} {paper.category}</span>
            <span className="sep">/</span>
            <span>#{String(paper.number).padStart(2, "0")}</span>
          </div>
          <h1 className="article-banner-title">{paper.title}</h1>
          <div className="article-banner-badges">
            <span className="badge-pill badge-pill--category">
              {meta.icon} {paper.category}
            </span>
            <span className="badge-pill badge-pill--glass">
              ~{paper.readingTimeMin} min read
            </span>
            {papers.length > 0 && (
              <span className="badge-pill badge-pill--glass">
                {papers.length} paper{papers.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="article-grid">
        <div>
          <MarkdownProse content={paper.content} />

          {/* Sources */}
          {papers.length > 0 && (
            <div className="sources-section">
              <div className="sources-heading">Sources &amp; Further Reading</div>
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

          {/* Prev/Next */}
          <ArticleNav prev={prev} next={next} current={idx + 1} total={total} />
        </div>
        <TableOfContents markdown={paper.content} />
      </div>

      <ScrollToTop />
    </div>
  );
}
