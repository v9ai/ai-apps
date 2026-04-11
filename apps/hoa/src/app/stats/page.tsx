import Link from "next/link";
import type { Metadata } from "next";
import { categories, getAllPersonalities } from "@/lib/personalities";
import { getEnrichment, formatNumber } from "@/lib/enrichment";
import { getEpisodesForPerson } from "@/lib/episodes";
import type { GitHubRepo } from "@/lib/enrichment";
import NavHeader from "@/app/_components/nav-header";
import { css, cx } from "styled-system/css";

export const metadata: Metadata = {
  title: "Stats",
  description: "Aggregate statistics across AI leaders featured on Humans of AI — GitHub stars, Hugging Face downloads, podcast appearances, research papers, and programming language distribution.",
  keywords: ["AI statistics", "GitHub stars", "Hugging Face downloads", "AI podcast stats", "machine learning researchers", "open source AI"],
  alternates: {
    canonical: "https://humans-of-ai.vercel.app/stats",
  },
  openGraph: {
    title: "Stats — Humans of AI",
    description: "Aggregate statistics across AI leaders — GitHub stars, Hugging Face downloads, podcast appearances, and research papers.",
    url: "https://humans-of-ai.vercel.app/stats",
  },
};

/* ── Category accent colors (solid, for bar fills) ─────────────── */
const categoryBarColors: Record<string, string> = {
  "lab-leaders": "#8B5CF6",
  builders: "#3B82F6",
  researchers: "#10B981",
  hosts: "#F59E0B",
  "rising-leaders": "#F43F5E",
  infrastructure: "#6366F1",
  "vector-dbs": "#84CC16",
};

/* ── SVG icon helpers ──────────────────────────────────────────── */

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L3.22 9.03a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 1.06L5.56 7.75h6.69a.75.75 0 0 1 0 1.5H5.56l2.22 2.22a.75.75 0 0 1 0 1.06z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PaperIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
    >
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.166c-1.879-1.148-4.243-1.408-7.028-.771a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
    </svg>
  );
}

/* ── Data aggregation ──────────────────────────────────────────── */

type AggregatedStats = {
  totalPersonalities: number;
  totalPodcasts: number;
  totalGitHubStars: number;
  totalHFDownloads: number;
  totalPapers: number;
  totalEpisodes: number;
  topRepos: (GitHubRepo & { ownerName: string; ownerSlug: string })[];
  languageDistribution: { name: string; count: number; color: string }[];
  topByPodcasts: { name: string; slug: string; count: number }[];
  topByStars: { name: string; slug: string; stars: number }[];
  topByPapers: { name: string; slug: string; count: number }[];
  categoryBreakdown: {
    title: string;
    slug: string;
    count: number;
    color: string;
  }[];
};

function aggregateStats(): AggregatedStats {
  const all = getAllPersonalities();

  let totalPodcasts = 0;
  let totalGitHubStars = 0;
  let totalHFDownloads = 0;
  let totalPapers = 0;
  let totalEpisodes = 0;

  const allRepos: (GitHubRepo & { ownerName: string; ownerSlug: string })[] =
    [];
  const langMap = new Map<string, { count: number; color: string }>();

  const podcastCounts: { name: string; slug: string; count: number }[] = [];
  const starCounts: { name: string; slug: string; stars: number }[] = [];
  const paperCounts: { name: string; slug: string; count: number }[] = [];

  for (const person of all) {
    // Podcast count
    totalPodcasts += person.podcasts.length;
    podcastCounts.push({
      name: person.name,
      slug: person.slug,
      count: person.podcasts.length,
    });

    // Papers
    const paperCount = person.papers?.length ?? 0;
    totalPapers += paperCount;
    if (paperCount > 0) {
      paperCounts.push({
        name: person.name,
        slug: person.slug,
        count: paperCount,
      });
    }

    // Episodes
    const episodes = getEpisodesForPerson(person.slug);
    totalEpisodes += episodes.length;

    // Enrichment data
    const enrichment = getEnrichment(person.slug);

    if (enrichment.github) {
      totalGitHubStars += enrichment.github.totalStars;
      starCounts.push({
        name: person.name,
        slug: person.slug,
        stars: enrichment.github.totalStars,
      });

      // Repos
      for (const repo of enrichment.github.repos) {
        allRepos.push({
          ...repo,
          ownerName: person.name,
          ownerSlug: person.slug,
        });
      }

      // Languages
      for (const lang of enrichment.github.languages) {
        const existing = langMap.get(lang.name);
        if (existing) {
          existing.count += lang.count;
        } else {
          langMap.set(lang.name, { count: lang.count, color: lang.color });
        }
      }
    }

    if (enrichment.huggingface) {
      totalHFDownloads += enrichment.huggingface.totalDownloads;
    }
  }

  // Sort and take top entries
  const topRepos = allRepos
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 10);

  const languageDistribution = Array.from(langMap.entries())
    .map(([name, { count, color }]) => ({ name, count, color }))
    .sort((a, b) => b.count - a.count);

  const topByPodcasts = podcastCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topByStars = starCounts
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 5);

  const topByPapers = paperCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const categoryBreakdown = categories.map((cat) => ({
    title: cat.title,
    slug: cat.slug,
    count: cat.personalities.length,
    color: categoryBarColors[cat.slug] ?? "#6B7280",
  }));

  return {
    totalPersonalities: all.length,
    totalPodcasts,
    totalGitHubStars,
    totalHFDownloads,
    totalPapers,
    totalEpisodes,
    topRepos,
    languageDistribution,
    topByPodcasts,
    topByStars,
    topByPapers,
    categoryBreakdown,
  };
}

/* ── Component: Stat card ──────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delay: string;
}) {
  return (
    <div
      className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: '2xl', p: { base: '5', md: '7' } }), "animate-fade-in-up")}
      style={{ animationDelay: delay }}
    >
      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '5' })}>
        <div className={css({ w: '9', h: '9', rounded: 'lg', bg: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
          {icon}
        </div>
        <span className={css({ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'medium', color: '#7B7B86' })}>
          {label}
        </span>
      </div>
      <p
        className={css({ fontSize: '4xl', fontWeight: 'black', letterSpacing: 'tight', lineHeight: 'none' })}
        style={{
          background: "linear-gradient(135deg, #E8E8ED 0%, #A78BFA 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Component: Section heading ────────────────────────────────── */

function SectionHeading({
  title,
  subtitle,
  delay,
}: {
  title: string;
  subtitle?: string;
  delay: string;
}) {
  return (
    <div
      className={cx(css({ mb: '8' }), "animate-fade-in-up")}
      style={{ animationDelay: delay }}
    >
      <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED', letterSpacing: '-0.01em' })}>
        {title}
      </h2>
      {subtitle && (
        <p className={css({ fontSize: 'sm', color: '#7B7B86', mt: '1' })}>{subtitle}</p>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function StatsPage() {
  const stats = aggregateStats();
  const maxCategoryCount = Math.max(
    ...stats.categoryBreakdown.map((c) => c.count),
  );
  const totalLangCount = stats.languageDistribution.reduce(
    (sum, l) => sum + l.count,
    0,
  );

  return (
    <main className={css({ minH: 'screen', bg: '#0B0B0F', color: '#E8E8ED', pt: '20', pb: { base: '24', md: '32' } })}>
      <NavHeader
        totalPersonalities={stats.totalPersonalities}
        totalPodcasts={stats.totalPodcasts}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <header className={css({ borderBottomWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
        <div className={css({ maxW: '6xl', mx: 'auto', px: '6', py: { base: '10', md: '14' } })}>
          <Link
            href="/"
            className={cx(css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', fontSize: 'sm', color: '#7B7B86', transition: 'colors', mb: '8', _hover: { color: '#C4C4CC' } }), "group")}
          >
            <ArrowLeftIcon className={css({ w: '4', h: '4', transition: 'transform', _groupHover: { transform: 'translateX(-2px)' } })} />
            Back to stories
          </Link>

          <div className={"animate-fade-in-up"}>
            <p className={css({ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 'bold', color: '#5A5A65', mb: '2' })}>
              Dashboard
            </p>
            <h1 className={css({ fontSize: '3xl', fontWeight: 'black', color: '#E8E8ED', letterSpacing: '-0.02em', lineHeight: { base: 'tight', md: 'none' }, sm: { fontSize: '4xl' }, md: { fontSize: '5xl' } })}>
              Humans of AI{" "}
              <span className={css({ color: '#7B7B86', fontWeight: 'light' })}>
                — By the Numbers
              </span>
            </h1>
            <p className={css({ color: '#9B9BA6', fontSize: 'sm', mt: '3', maxW: 'xl', lineHeight: 'relaxed' })}>
              An aggregate view across{" "}
              <span className={css({ color: '#C4C4CC', fontWeight: 'medium' })}>
                {stats.totalPersonalities} personalities
              </span>
              , their open-source footprint, research output, and podcast
              appearances.
            </p>
          </div>
        </div>
      </header>

      <div className={css({ maxW: '6xl', mx: 'auto', px: { base: '5', sm: '6', md: '8' } })}>
        {/* ── Top-level stat cards ────────────────────────────── */}
        <section className={css({ mt: '12', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: { base: '4', md: '5' }, md: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }, xl: { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' } })}>
          <StatCard
            label="Personalities"
            value={stats.totalPersonalities.toString()}
            icon={<UsersIcon className={css({ w: '4', h: '4', color: '#9B9BA6' })} />}
            delay="0.05s"
          />
          <StatCard
            label="Podcasts"
            value={formatNumber(stats.totalPodcasts)}
            icon={<MicIcon className={css({ w: '4', h: '4', color: '#9B9BA6' })} />}
            delay="0.1s"
          />
          <StatCard
            label="GitHub Stars"
            value={formatNumber(stats.totalGitHubStars)}
            icon={<StarIcon className={css({ w: '4', h: '4', color: '#9B9BA6' })} />}
            delay="0.15s"
          />
          <StatCard
            label="HF Downloads"
            value={formatNumber(stats.totalHFDownloads)}
            icon={<DownloadIcon className={css({ w: '4', h: '4', color: '#9B9BA6' })} />}
            delay="0.2s"
          />
          <StatCard
            label="Papers"
            value={stats.totalPapers.toString()}
            icon={<PaperIcon className={css({ w: '4', h: '4', color: '#9B9BA6' })} />}
            delay="0.25s"
          />
          <StatCard
            label="Episodes"
            value={formatNumber(stats.totalEpisodes)}
            icon={<SpotifyIcon className={css({ w: '4', h: '4', color: '#1DB954' })} />}
            delay="0.3s"
          />
        </section>

        {/* ── Category Breakdown ──────────────────────────────── */}
        <section className={css({ mt: '20' })}>
          <SectionHeading
            title="Category Breakdown"
            subtitle="Distribution of personalities across research domains"
            delay="0.35s"
          />
          <div
            className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', p: { base: '5', md: '8' } }), "animate-fade-in-up")}
            style={{ animationDelay: "0.4s" }}
          >
            <div className={css({ display: 'flex', flexDir: 'column', gap: '5' })}>
              {stats.categoryBreakdown.map((cat) => {
                const pct = (cat.count / maxCategoryCount) * 100;
                return (
                  <div key={cat.slug}>
                    <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '2' })}>
                      <span className={css({ fontSize: 'sm', color: '#C4C4CC', fontWeight: 'medium' })}>
                        {cat.title}
                      </span>
                      <span className={css({ fontSize: 'xs', color: '#7B7B86', fontVariantNumeric: 'tabular-nums', fontWeight: 'medium' })}>
                        {cat.count}{" "}
                        {cat.count === 1 ? "person" : "people"}
                      </span>
                    </div>
                    <div className={css({ h: '2', rounded: 'full', bg: 'rgba(255,255,255,0.04)', overflow: 'hidden' })}>
                      <div
                        className={css({ h: 'full', rounded: 'full', transition: 'all', transitionDuration: '700ms' })}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Two-column: Top Repos + Language Distribution ──── */}
        <div className={css({ mt: '20', display: 'grid', gap: { base: '6', md: '8' }, lg: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
          {/* Top Repositories */}
          <section>
            <SectionHeading
              title="Top Repositories"
              subtitle="Highest-starred repos across all personalities"
              delay="0.45s"
            />
            <div
              className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', overflow: 'hidden' }), "animate-fade-in-up")}
              style={{ animationDelay: "0.5s" }}
            >
              {stats.topRepos.length === 0 ? (
                <p className={css({ color: '#7B7B86', fontSize: 'sm', p: '6' })}>
                  No repository data available.
                </p>
              ) : (
                <div>
                  {stats.topRepos.map((repo, i) => (
                    <div
                      key={`${repo.ownerSlug}-${repo.name}`}
                      className={css({ display: 'flex', alignItems: 'center', gap: '4', px: '6', py: '4', transition: 'colors', borderTopWidth: i > 0 ? '1px' : undefined, borderColor: 'rgba(255,255,255,0.04)', _hover: { bg: 'rgba(255,255,255,0.02)' } })}
                    >
                      <span className={css({ fontSize: '11px', fontWeight: 'bold', color: '#5A5A65', w: '5', textAlign: 'right', fontVariantNumeric: 'tabular-nums' })}>
                        {i + 1}
                      </span>
                      <div className={css({ flex: '1', minW: '0' })}>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED', transition: 'colors', truncate: true, display: 'block', _hover: { color: 'white' } })}
                        >
                          {repo.name}
                        </a>
                        <p className={css({ fontSize: '11px', color: '#7B7B86', truncate: true, mt: '0.5' })}>
                          <Link
                            href={`/person/${repo.ownerSlug}`}
                            className={css({ transition: 'colors', _hover: { color: '#9B9BA6' } })}
                          >
                            {repo.ownerName}
                          </Link>
                          {repo.language && (
                            <>
                              <span className={css({ mx: '1.5', color: '#5A5A65' })}>
                                /
                              </span>
                              {repo.language}
                            </>
                          )}
                        </p>
                      </div>
                      <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5', flexShrink: 0 })}>
                        <StarIcon className={css({ w: '3.5', h: '3.5', color: '#7B7B86' })} />
                        <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: '#C4C4CC', fontVariantNumeric: 'tabular-nums' })}>
                          {formatNumber(repo.stars)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Language Distribution */}
          <section>
            <SectionHeading
              title="Language Distribution"
              subtitle="Aggregated from all GitHub profiles"
              delay="0.45s"
            />
            <div
              className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', p: '6' }), "animate-fade-in-up")}
              style={{ animationDelay: "0.5s" }}
            >
              {stats.languageDistribution.length === 0 ? (
                <p className={css({ color: '#7B7B86', fontSize: 'sm' })}>
                  No language data available.
                </p>
              ) : (
                <>
                  {/* Stacked bar */}
                  <div className={css({ h: '5', rounded: 'full', overflow: 'hidden', display: 'flex', mb: '6' })}>
                    {stats.languageDistribution.map((lang) => {
                      const pct = (lang.count / totalLangCount) * 100;
                      if (pct < 1) return null;
                      return (
                        <div
                          key={lang.name}
                          className={css({ h: 'full', transition: 'all', transitionDuration: '500ms', _first: { borderStartStartRadius: 'full', borderEndStartRadius: 'full' }, _last: { borderStartEndRadius: 'full', borderEndEndRadius: 'full' } })}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: lang.color,
                            opacity: 0.85,
                          }}
                          title={`${lang.name}: ${lang.count} repos (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend grid */}
                  <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: '8', rowGap: '3' })}>
                    {stats.languageDistribution.slice(0, 12).map((lang) => {
                      const pct = (
                        (lang.count / totalLangCount) *
                        100
                      ).toFixed(1);
                      return (
                        <div
                          key={lang.name}
                          className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}
                        >
                          <div className={css({ display: 'flex', alignItems: 'center', gap: '2', minW: '0' })}>
                            <span
                              className={css({ w: '2.5', h: '2.5', rounded: 'full', flexShrink: 0 })}
                              style={{ backgroundColor: lang.color }}
                            />
                            <span className={css({ fontSize: 'sm', color: '#C4C4CC', truncate: true })}>
                              {lang.name}
                            </span>
                          </div>
                          <div className={css({ display: 'flex', alignItems: 'center', gap: '2', flexShrink: 0, ml: '2' })}>
                            <span className={css({ fontSize: 'xs', color: '#7B7B86', fontVariantNumeric: 'tabular-nums' })}>
                              {lang.count}
                            </span>
                            <span className={css({ fontSize: '10px', color: '#5A5A65', fontVariantNumeric: 'tabular-nums', w: '10', textAlign: 'right' })}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stats.languageDistribution.length > 12 && (
                    <p className={css({ fontSize: '11px', color: '#5A5A65', mt: '3' })}>
                      +{stats.languageDistribution.length - 12} more
                      languages
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* ── Most Prolific ───────────────────────────────────── */}
        <section className={css({ mt: '20' })}>
          <SectionHeading
            title="Most Prolific"
            subtitle="Top contributors across key metrics"
            delay="0.55s"
          />

          <div className={css({ display: 'grid', gap: '4', md: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } })}>
            {/* Top by Podcasts */}
            <div
              className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', p: '5' }), "animate-fade-in-up")}
              style={{ animationDelay: "0.6s" }}
            >
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
                <MicIcon className={css({ w: '4', h: '4', color: '#7B7B86' })} />
                <h3 className={css({ fontSize: 'xs', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'semibold', color: '#7B7B86' })}>
                  By Podcast Count
                </h3>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {stats.topByPodcasts.map((entry, i) => (
                  <div
                    key={entry.slug}
                    className={css({ display: 'flex', alignItems: 'center', gap: '3', rounded: 'lg', px: '2', mx: '-2', transition: 'colors', _hover: { bg: 'rgba(255,255,255,0.03)' } })}
                  >
                    <span
                      className={css({
                        w: '5', h: '5', rounded: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
                        bg: i === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                        color: i === 0 ? '#A78BFA' : '#7B7B86',
                      })}
                    >
                      {i + 1}
                    </span>
                    <Link
                      href={`/person/${entry.slug}`}
                      className={css({ fontSize: 'sm', color: '#E8E8ED', transition: 'colors', truncate: true, flex: '1', minW: '0', _hover: { color: '#FFFFFF' } })}
                    >
                      {entry.name}
                    </Link>
                    <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: '#E8E8ED', fontVariantNumeric: 'tabular-nums', flexShrink: 0 })}>
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by GitHub Stars */}
            <div
              className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', p: '5' }), "animate-fade-in-up")}
              style={{ animationDelay: "0.65s" }}
            >
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
                <GitHubIcon className={css({ w: '4', h: '4', color: '#7B7B86' })} />
                <h3 className={css({ fontSize: 'xs', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'semibold', color: '#7B7B86' })}>
                  By GitHub Stars
                </h3>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {stats.topByStars.map((entry, i) => (
                  <div
                    key={entry.slug}
                    className={css({ display: 'flex', alignItems: 'center', gap: '3', rounded: 'lg', px: '2', mx: '-2', transition: 'colors', _hover: { bg: 'rgba(255,255,255,0.03)' } })}
                  >
                    <span
                      className={css({
                        w: '5', h: '5', rounded: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
                        bg: i === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                        color: i === 0 ? '#A78BFA' : '#7B7B86',
                      })}
                    >
                      {i + 1}
                    </span>
                    <Link
                      href={`/person/${entry.slug}`}
                      className={css({ fontSize: 'sm', color: '#E8E8ED', transition: 'colors', truncate: true, flex: '1', minW: '0', _hover: { color: '#FFFFFF' } })}
                    >
                      {entry.name}
                    </Link>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '1', flexShrink: 0 })}>
                      <StarIcon className={css({ w: '3', h: '3', color: '#7B7B86' })} />
                      <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: '#E8E8ED', fontVariantNumeric: 'tabular-nums' })}>
                        {formatNumber(entry.stars)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by Papers */}
            <div
              className={cx(css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', p: '5' }), "animate-fade-in-up")}
              style={{ animationDelay: "0.7s" }}
            >
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
                <PaperIcon className={css({ w: '4', h: '4', color: '#7B7B86' })} />
                <h3 className={css({ fontSize: 'xs', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'semibold', color: '#7B7B86' })}>
                  By Paper Count
                </h3>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                {stats.topByPapers.length === 0 ? (
                  <p className={css({ color: '#7B7B86', fontSize: 'sm' })}>
                    No paper data available.
                  </p>
                ) : (
                  stats.topByPapers.map((entry, i) => (
                    <div
                      key={entry.slug}
                      className={css({ display: 'flex', alignItems: 'center', gap: '3', rounded: 'lg', px: '2', mx: '-2', transition: 'colors', _hover: { bg: 'rgba(255,255,255,0.03)' } })}
                    >
                      <span
                        className={css({
                          w: '5', h: '5', rounded: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
                          bg: i === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                          color: i === 0 ? '#A78BFA' : '#7B7B86',
                        })}
                      >
                        {i + 1}
                      </span>
                      <Link
                        href={`/person/${entry.slug}`}
                        className={css({ fontSize: 'sm', color: '#E8E8ED', transition: 'colors', truncate: true, flex: '1', minW: '0', _hover: { color: '#FFFFFF' } })}
                      >
                        {entry.name}
                      </Link>
                      <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: '#E8E8ED', fontVariantNumeric: 'tabular-nums', flexShrink: 0 })}>
                        {entry.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer note ─────────────────────────────────────── */}
        <div
          className={cx(css({ mt: '20', textAlign: 'center' }), "animate-fade-in-up")}
          style={{ animationDelay: "0.8s" }}
        >
          <div className={cx("gradient-divider", css({ maxW: 'xs', mx: 'auto', mb: '6' }))} />
          <p className={css({ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5A5A65' })}>
            Data aggregated from GitHub, Hugging Face, and Spotify
          </p>
        </div>
      </div>
    </main>
  );
}
