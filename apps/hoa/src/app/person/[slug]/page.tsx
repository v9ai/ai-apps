import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getAllPersonalities,
  getPersonalityBySlug,
  getCategoryForPersonality,
  getCategoryColor,
  getInitials,
  getAvatarUrlWithEnrichment,
  getResearch,
  getEnrichedTimeline,
} from "@/lib/personalities";
import { getEpisodesForPerson } from "@/lib/episodes";
import { getEnrichment, formatNumber } from "@/lib/enrichment";
import type { Metadata } from "next";
import { css, cx } from "styled-system/css";

/* ─── Extracted components ────────────────────────────── */
import { ExternalLinkIcon, MicrophoneIcon, GitHubIcon, PencilIcon } from "./_components/icons";
import { GitHubSection } from "./_components/github-section";
import { HuggingFaceSection } from "./_components/huggingface-section";
import { TechStackSection } from "./_components/tech-stack-section";
import { EpisodesSection } from "./_components/episodes-section";
import { PapersSection } from "./_components/papers-section";
import { ResearchBio } from "./_components/research-bio";
import { EnrichedTimelineSection, ResearchTimeline } from "./_components/research-timeline";
import { ResearchContributions } from "./_components/research-contributions";
import { ResearchQuotes } from "./_components/research-quotes";
import { ResearchSocial } from "./_components/research-social";
import { ResearchSources } from "./_components/research-sources";
import { VideosSection } from "./_components/videos-section";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) return {};
  const title = person.name;
  const description = person.description;
  const url = `https://humansofai.space/person/${slug}`;
  return {
    title,
    description,
    keywords: [
      person.name,
      person.role,
      person.org,
      "AI",
      "artificial intelligence",
      "machine learning",
      "podcast",
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function generateStaticParams() {
  return getAllPersonalities().map((p) => ({ slug: p.slug }));
}

/* ─── Main page ───────────────────────────────────────── */

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) notFound();

  const category = getCategoryForPersonality(slug)!;
  const gradient = getCategoryColor(category.slug);
  const episodes = getEpisodesForPerson(slug);
  const research = getResearch(slug);
  const enrichedTimeline = getEnrichedTimeline(slug);
  const enriched = getEnrichment(slug);
  const avatar = getAvatarUrlWithEnrichment(person, enriched.imageUrl);

  const hasResearch = !!research;
  const hasContentSections =
    episodes.length > 0 ||
    (person.papers && person.papers.length > 0) ||
    hasResearch ||
    (enriched.github && enriched.github.repos.length > 0) ||
    (enriched.huggingface && enriched.huggingface.models.length > 0);

  const hasStatBadges =
    person.podcasts.length > 0 ||
    episodes.length > 0 ||
    (person.papers && person.papers.length > 0) ||
    (enriched.github && enriched.github.totalStars > 0) ||
    (enriched.huggingface && enriched.huggingface.totalDownloads > 0) ||
    (enriched.github?.profile && enriched.github.profile.followers > 0);

  const editUrl = `https://github.com/nicolad/ai-apps/blob/main/apps/podcasts/personalities/${slug}.ts`;

  return (
    <main className={css({ minH: 'screen', bg: '#0B0B0F' })}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: person.name,
            jobTitle: person.role,
            worksFor: {
              "@type": "Organization",
              name: person.org,
            },
            description: person.description,
            url: `https://humansofai.space/person/${slug}`,
            ...(person.github
              ? { sameAs: [`https://github.com/${person.github}`] }
              : {}),
            ...(person.github
              ? { image: `https://avatars.githubusercontent.com/${person.github}` }
              : {}),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://humansofai.space",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: person.name,
                item: `https://humansofai.space/person/${slug}`,
              },
            ],
          }),
        }}
      />
      {/* ── Hero ────────────────────────────────────────── */}
      <div className={css({ pos: 'relative', overflow: 'hidden' })}>
        <div className={css({ pos: 'relative', zIndex: 10, maxW: '7xl', mx: 'auto', px: { base: '5', sm: '6', lg: '8' } })}>
          {/* Back nav + Edit btn */}
          <div className={cx("animate-fade-in", css({ pt: { base: '6', md: '8' }, pb: { base: '5', md: '6' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }))} style={{ animationDelay: "0.1s" }}>
            <Link
              href="/"
              className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', fontSize: 'sm', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', _hover: { color: '#C4C4CC' } }))}
            >
              {/* Arrow icon */}
              <svg
                viewBox="0 0 16 16"
                className={css({ w: '4', h: '4', transition: 'transform', transitionDuration: '200ms', transitionTimingFunction: 'ease-out', _groupHover: { transform: 'translateX(-0.125rem)' } })}
                fill="currentColor"
              >
                <path d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" />
              </svg>
              {/* Home icon */}
              <svg
                viewBox="0 0 16 16"
                className={css({ w: '3.5', h: '3.5', opacity: 0.5, transition: 'opacity', transitionDuration: '200ms', _groupHover: { opacity: 0.8 } })}
                fill="currentColor"
              >
                <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 2 7.5V14a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-3h2v3a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5V7.5a.5.5 0 0 0-.146-.354L8.354 1.146z" />
              </svg>
              <span className={css({ textUnderlineOffset: '2px', _groupHover: { textDecoration: 'underline', textDecorationColor: 'rgba(123,123,134,0.5)' } })}>Back</span>
            </Link>
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '2', px: '4', py: '2', rounded: 'lg', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', transition: 'all', transitionDuration: '200ms', fontSize: 'xs', color: '#8B8B96', _hover: { bg: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: '#E8E8ED' } }))}
            >
              <PencilIcon className={css({ w: '3.5', h: '3.5' })} />
              <span>Edit</span>
              <ExternalLinkIcon className={css({ w: '3', h: '3', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#C4C4CC' } })} />
            </a>
          </div>

          {/* Profile hero */}
          <div className={css({ display: 'flex', alignItems: { base: 'flex-start', sm: 'center' }, gap: { base: '4', sm: '6', md: '8' }, pb: { base: '10', md: '12' } })}>
            <div className={css({ pos: 'relative', flexShrink: 0 })}>
              {avatar ? (
                <Image
                  src={avatar}
                  alt={`Photo of ${person.name}, ${person.role} at ${person.org}`}
                  width={120}
                  height={120}
                  unoptimized
                  className={css({ pos: 'relative', w: '20', h: '20', md: { w: '120px', h: '120px' }, rounded: 'full', objectFit: 'cover', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.12)', shadow: '0 0 0 4px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)' })}
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${person.name} initials`}
                  className={css({ pos: 'relative', w: '20', h: '20', md: { w: '120px', h: '120px' }, rounded: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '2xl', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.12)', shadow: '0 0 0 4px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.5)' })}
                  style={{ background: gradient }}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            <div
              className={cx("animate-fade-in-up", css({ display: 'flex', flexDir: 'column', minW: '0' }))}
              style={{ animationDelay: "0.15s" }}
            >
              <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', alignSelf: 'flex-start', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.25em', mb: '2.5', px: '3', py: '0.5', rounded: 'full', bg: 'rgba(255,255,255,0.06)', color: '#8B8B96', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
                <span
                  className={css({ w: '1.5', h: '1.5', rounded: 'full', flexShrink: 0 })}
                  style={{ background: gradient }}
                />
                {category.title}
              </span>
              <h1 className={css({ fontSize: '2xl', sm: { fontSize: '3xl' }, md: { fontSize: '4xl' }, fontWeight: '900', color: '#E8E8ED', letterSpacing: '-0.02em', lineHeight: 'tight' })}>
                {person.name}
              </h1>
              <p className={css({ color: '#8B8B96', fontSize: 'sm', fontWeight: 'medium', letterSpacing: 'wide', mt: '2' })}>
                {person.role}{" "}
                <span className={css({ color: '#7B7B86', mx: '1.5' })}>|</span>
                <span className={css({ color: '#8B8B96' })}>{person.org}</span>
              </p>
              <p className={css({ color: '#C4C4CC', fontSize: '0.9375rem', mt: '3.5', maxW: 'xl', lineHeight: 'relaxed' })}>
                {person.description}
              </p>
            </div>
          </div>
        </div>

        <div className={css({ pos: 'relative', zIndex: 10, maxW: '7xl', mx: 'auto', px: { base: '5', sm: '6', lg: '8' } })}>
          <div className={css({ h: '1px', bgGradient: 'to-r', gradientFrom: 'transparent', gradientVia: 'rgba(255,255,255,0.10)', gradientTo: 'transparent' })} />
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className={css({ maxW: '7xl', mx: 'auto', px: { base: '5', sm: '6', lg: '8' }, pb: { base: '14', md: '20' } })}>

        {/* ── Quick Info Bar ──────────────────────────────── */}
        {(hasStatBadges || person.github) && (
        <div
          role="list"
          className={cx("animate-fade-in-up", css({ mt: { base: '8', md: '10' }, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { base: '3', md: '4' } }))}
          style={{ animationDelay: "0.2s" }}
        >
{episodes.length > 0 && (
            <div role="listitem" className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.10)', bg: '#1C1C22' } })}>
              <svg viewBox="0 0 16 16" className={css({ w: '4', h: '4', color: '#1DB954' })} fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.166c-1.879-1.148-4.243-1.408-7.028-.771a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z" />
              </svg>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED' })}>{episodes.length}</span>
              <span className={css({ fontSize: 'xs', color: '#8B8B96' })}>episodes</span>
            </div>
          )}

          {person.papers && person.papers.length > 0 && (
            <div role="listitem" className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.10)', bg: '#1C1C22' } })}>
              <svg viewBox="0 0 24 24" className={css({ w: '4', h: '4', color: 'blue.400/70' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED' })}>{person.papers.length}</span>
              <span className={css({ fontSize: 'xs', color: '#8B8B96' })}>papers</span>
            </div>
          )}

          {enriched.github && enriched.github.totalStars > 0 && (
            <div role="listitem" className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.10)', bg: '#1C1C22' } })}>
              <svg viewBox="0 0 24 24" className={css({ w: '4', h: '4', color: 'yellow.400/70' })} fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED' })}>{formatNumber(enriched.github.totalStars)}</span>
              <span className={css({ fontSize: 'xs', color: '#8B8B96' })}>stars</span>
            </div>
          )}

          {enriched.huggingface && enriched.huggingface.totalDownloads > 0 && (
            <div role="listitem" className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.10)', bg: '#1C1C22' } })}>
              <svg viewBox="0 0 24 24" className={css({ w: '4', h: '4', color: 'sky.400/70' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED' })}>{formatNumber(enriched.huggingface.totalDownloads)}</span>
              <span className={css({ fontSize: 'xs', color: '#8B8B96' })}>model downloads</span>
            </div>
          )}

          {enriched.github?.profile && enriched.github.profile.followers > 0 && (
            <div role="listitem" className={css({ display: 'flex', alignItems: 'center', gap: '2.5', px: '5', py: '2.5', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.10)', bg: '#1C1C22' } })}>
              <svg viewBox="0 0 24 24" className={css({ w: '4', h: '4', color: 'emerald.400/70' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED' })}>{formatNumber(enriched.github.profile.followers)}</span>
              <span className={css({ fontSize: 'xs', color: '#8B8B96' })}>followers</span>
            </div>
          )}

          {hasStatBadges && person.github && (
            <div className={css({ w: '1px', h: '6', bg: 'rgba(255,255,255,0.08)', display: 'none', sm: { display: 'block' }, mx: '1' })} />
          )}

          {person.github && (
            <a
              href={`https://github.com/${person.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '2', px: '4', py: '2.5', rounded: 'xl', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.12)', bg: 'rgba(255,255,255,0.08)' } }))}
            >
              <GitHubIcon className={css({ w: '4', h: '4', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#E8E8ED' } })} />
              <span className={css({ fontSize: 'xs', fontWeight: 'medium', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', textTransform: 'uppercase', letterSpacing: 'wide', _groupHover: { color: '#C4C4CC' } })}>GitHub</span>
              <span className={css({ fontSize: 'sm', color: '#8B8B96', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#E8E8ED' } })}>{person.github}</span>
              <ExternalLinkIcon className={css({ w: '3', h: '3', color: '#7B7B86', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#C4C4CC' } })} />
            </a>
          )}
        </div>
        )}

        {/* ── Extracted content sections ────────────────────── */}
        <GitHubSection github={enriched.github} />
        <HuggingFaceSection huggingface={enriched.huggingface} />
        {enriched.github && enriched.github.languages.length > 0 && (
          <TechStackSection languages={enriched.github.languages} />
        )}
        <EpisodesSection episodes={episodes} />
        {research?.videos && research.videos.length > 0 && (
          <VideosSection videos={research.videos} />
        )}
        {person.papers && person.papers.length > 0 && (
          <PapersSection papers={person.papers} />
        )}

        {/* ── Deep Research ────────────────────────────────── */}
        {hasResearch && (
          <>
            <ResearchBio research={research} />
            <ResearchSocial research={research} />
            {enrichedTimeline ? (
              <EnrichedTimelineSection events={enrichedTimeline} />
            ) : (
              <ResearchTimeline research={research} />
            )}
            <ResearchContributions research={research} />
            <ResearchQuotes research={research} />
            <ResearchSources research={research} />
          </>
        )}

        {/* ── Empty State ─────────────────────────────────── */}
        {!hasContentSections && (
          <div
            className={cx("animate-fade-in-up", css({ mt: '16', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: 'xl', px: { base: '5', md: '8' }, py: { base: '8', md: '10' }, textAlign: 'center' }))}
            style={{ animationDelay: "0.35s" }}
          >
            <div className={css({ w: '12', h: '12', rounded: 'full', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: '5' })}>
              <svg viewBox="0 0 24 24" className={css({ w: '6', h: '6', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
            <p className={css({ color: '#8B8B96', fontSize: 'sm' })}>More content coming soon</p>
            <p className={css({ color: '#7B7B86', fontSize: 'xs', mt: '2.5' })}>Episode data, research, and more will appear here as they become available.</p>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <div className={css({ mt: { base: '14', md: '20' } })}>
          <div className={css({ h: '1px', bg: 'rgba(255,255,255,0.06)', mb: { base: '8', md: '10' } })} />
          <div className={css({ display: 'flex', flexDir: 'column', sm: { flexDir: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: { base: '4', md: '6' } })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', fontSize: 'sm' })}>
              <div className={css({ w: '2.5', h: '2.5', rounded: 'full', bg: '#7B7B86' })} />
              <span className={css({ color: '#7B7B86' })}>{category.title}</span>
              <span className={css({ color: '#7B7B86' })}>/</span>
              <span className={css({ color: '#E8E8ED', fontWeight: 'medium' })}>{person.name}</span>
            </div>
            <Link
              href="/"
              className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '2.5', px: '6', py: '3', rounded: 'full', bg: 'rgba(255,255,255,0.08)', color: '#E8E8ED', fontSize: 'sm', fontWeight: 'semibold', transition: 'all', transitionDuration: '200ms', _hover: { bg: 'rgba(255,255,255,0.12)' } }))}
            >
              <svg
                viewBox="0 0 16 16"
                className={css({ w: '3.5', h: '3.5', transition: 'transform', transitionDuration: '200ms', _groupHover: { transform: 'translateX(-0.25rem)' } })}
                fill="currentColor"
              >
                <path d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" />
              </svg>
              All Profiles
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
