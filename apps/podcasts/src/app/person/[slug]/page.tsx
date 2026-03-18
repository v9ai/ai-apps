import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllPersonalities,
  getPersonalityBySlug,
  getCategoryForPersonality,
  getCategoryColor,
  getInitials,
  getAvatarUrl,
  getResearch,
} from "@/lib/personalities";
import { getEpisodesForPerson } from "@/lib/episodes";
import { enrichPerson, formatNumber } from "@/lib/langchain";
import type { Metadata } from "next";
import type { PersonResearch } from "@/lib/personalities";
import type { EnrichedData, GitHubRepo, HFModel } from "@/lib/langchain";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) return {};
  return {
    title: `${person.name} — AI Podcast Index`,
    description: person.description,
  };
}

export function generateStaticParams() {
  return getAllPersonalities().map((p) => ({ slug: p.slug }));
}

/* ─── Icon components ─────────────────────────────────── */

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor">
      <path d="M3.75 2a.75.75 0 0 0 0 1.5h6.69L2.72 11.22a.75.75 0 1 0 1.06 1.06L11.5 4.56v6.69a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-.75-.75H3.75z" />
    </svg>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
    </svg>
  );
}

/* ─── Research sections ───────────────────────────────── */

function ResearchBio({ research }: { research: PersonResearch }) {
  return (
    <div className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/[0.07] flex items-center justify-center shadow-xl border border-white/[0.08]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Deep Research</h2>
      </div>
      <p className="text-neutral-300 text-sm leading-relaxed max-w-3xl">
        {research.bio}
      </p>

      {/* Topics */}
      {research.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {research.topics.map((topic) => (
            <span
              key={topic}
              className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-neutral-400"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchTimeline({ research }: { research: PersonResearch }) {
  if (!research.timeline.length) return null;
  return (
    <div className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/[0.07] flex items-center justify-center shadow-xl border border-white/[0.08]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Timeline</h2>
        <span className="text-sm text-neutral-500">{research.timeline.length} events</span>
      </div>

      <div className="relative ml-7 border-l border-white/[0.08] pl-8 space-y-6">
        {research.timeline.map((event, i) => (
          <div
            key={`${event.date}-${i}`}
            className="relative animate-row-enter"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Dot on the timeline */}
            <div className="absolute -left-[41px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30" />

            <div className="text-xs text-neutral-500 font-mono mb-1">{event.date}</div>
            {event.url ? (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-300 hover:text-white transition-colors duration-200 inline-flex items-center gap-1.5"
              >
                {event.event}
                <ExternalLinkIcon className="w-3 h-3 text-neutral-600" />
              </a>
            ) : (
              <p className="text-sm text-neutral-300">{event.event}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchContributions({ research }: { research: PersonResearch }) {
  if (!research.key_contributions.length) return null;
  return (
    <div className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/[0.07] flex items-center justify-center shadow-xl border border-white/[0.08]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Key Contributions</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {research.key_contributions.map((c, i) => (
          <a
            key={c.title}
            href={c.url || undefined}
            target={c.url ? "_blank" : undefined}
            rel={c.url ? "noopener noreferrer" : undefined}
            className={`block px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group animate-row-enter ${!c.url ? "cursor-default" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors duration-200">
                  {c.title}
                </span>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {c.description}
                </p>
              </div>
              {c.url && (
                <ExternalLinkIcon className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 flex-shrink-0 mt-0.5 transition-colors duration-200" />
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ResearchQuotes({ research }: { research: PersonResearch }) {
  if (!research.quotes.length) return null;
  return (
    <div className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-white/[0.07] flex items-center justify-center shadow-xl border border-white/[0.08]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Notable Quotes</h2>
      </div>

      <div className="space-y-4">
        {research.quotes.map((q, i) => (
          <div
            key={i}
            className="px-6 py-5 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-row-enter"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <p className="text-sm text-neutral-200 italic leading-relaxed">
              &ldquo;{q.text}&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
              <span>{q.source}</span>
              {q.url && (
                <>
                  <span>·</span>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neutral-300 transition-colors duration-200 inline-flex items-center gap-1"
                  >
                    Source <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchSocial({ research }: { research: PersonResearch }) {
  const socialEntries = Object.entries(research.social).filter(([, v]) => v);
  if (!socialEntries.length) return null;

  const icons: Record<string, string> = {
    github: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z",
    twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    website: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    huggingface: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2.5 7.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S8 11.83 8 11s.67-1.5 1.5-1.5zm5 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S13 11.83 13 11s.67-1.5 1.5-1.5zM12 17.5c-2.33 0-4.32-1.45-5.12-3.5h1.67c.69 1.19 1.97 2 3.45 2s2.76-.81 3.45-2h1.67c-.8 2.05-2.79 3.5-5.12 3.5z",
    blog: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    devpost: "M6.002 1.61L0 12.004L6.002 22.39h11.996L24 12.004L17.998 1.61H6.002zm1.593 4.084h3.947c3.605 0 6.276 1.695 6.276 6.31c0 4.436-3.21 6.302-6.456 6.302H7.595V5.694zm2.517 2.449v7.714h1.241c2.646 0 3.862-1.55 3.862-3.861c0-2.269-1.2-3.853-3.768-3.853h-1.335z",
  };

  return (
    <div className="mt-10 flex flex-wrap gap-3">
      {socialEntries.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 text-xs text-neutral-400 hover:text-white capitalize"
        >
          {icons[key] && (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d={icons[key]} />
            </svg>
          )}
          {key}
        </a>
      ))}
    </div>
  );
}

function ResearchSources({ research }: { research: PersonResearch }) {
  if (!research.sources.length) return null;
  return (
    <div className="mt-16">
      <details className="group">
        <summary className="flex items-center gap-3 cursor-pointer text-sm text-neutral-500 hover:text-neutral-300 transition-colors duration-200">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {research.sources.length} sources
          <span className="text-neutral-600 text-xs">(click to expand)</span>
        </summary>
        <div className="mt-4 space-y-1.5 pl-7">
          {research.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-neutral-500 hover:text-neutral-300 transition-colors duration-200 truncate"
            >
              {s.title || s.url}
            </a>
          ))}
        </div>
      </details>
      <p className="mt-3 text-[11px] text-neutral-600">
        Research generated {new Date(research.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────── */

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) notFound();

  const category = getCategoryForPersonality(slug)!;
  const gradient = getCategoryColor(category.slug);
  const avatar = getAvatarUrl(person);
  const episodes = getEpisodesForPerson(slug);
  const research = getResearch(slug);
  const enriched = await enrichPerson(person.github, research?.social);

  const hasEpisodes = episodes.length > 0;
  const hasPapers = person.papers && person.papers.length > 0;
  const hasResearch = !!research;
  const hasGitHub = !!enriched.github && enriched.github.repos.length > 0;
  const hasHuggingFace = !!enriched.huggingface && enriched.huggingface.models.length > 0;
  const hasContentSections = hasEpisodes || hasPapers || hasResearch || hasGitHub || hasHuggingFace;

  return (
    <main className="min-h-screen bg-[#050505]">
      {/* ── Hero with decorative grid ────────────────────── */}
      <div className="relative overflow-hidden hero-glow">
        {/* Category gradient background */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/70 to-[#050505]" />

        {/* Decorative grid pattern (pure CSS) */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Diagonal mesh accent lines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(-45deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "96px 96px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          {/* Back nav */}
          <div className="pt-8 pb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors duration-200 group"
            >
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200"
                fill="currentColor"
              >
                <path d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" />
              </svg>
              Back
            </Link>
          </div>

          {/* Profile hero */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-10 pb-16">
            {/* Avatar with glow ring */}
            <div className="relative flex-shrink-0">
              <div className={`absolute -inset-3 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl`} />
              {avatar ? (
                <img
                  src={avatar}
                  alt={person.name}
                  width={232}
                  height={232}
                  className="relative w-44 h-44 md:w-56 md:h-56 rounded-full object-cover shadow-2xl shadow-black/60 ring-[3px] ring-white/[0.15] animate-float"
                />
              ) : (
                <div
                  className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-5xl shadow-2xl shadow-black/60 ring-[3px] ring-white/[0.15] animate-float`}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            <div
              className="flex flex-col items-center md:items-start text-center md:text-left md:pb-3 animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <span className="relative inline-block text-[10px] font-bold uppercase tracking-[0.25em] mb-4 px-4 py-1.5 rounded-full border border-white/[0.12] text-white/70 overflow-hidden">
                <span className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-[0.15]`} />
                <span className="relative">{category.title}</span>
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.92] mb-4">
                {person.name}
              </h1>
              <p className="text-neutral-200 text-lg font-medium tracking-wide">
                {person.role}{" "}
                <span className="text-neutral-600 mx-1.5">|</span>
                <span className="text-neutral-300">{person.org}</span>
              </p>
              <p className="text-neutral-400 text-[15px] mt-4 max-w-xl leading-relaxed">
                {person.description}
              </p>
            </div>
          </div>
        </div>

        {/* Gradient divider line matching category gradient */}
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div
            className={`h-px bg-gradient-to-r ${gradient} opacity-30`}
          />
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Quick Info Bar ──────────────────────────────── */}
        <div
          className="mt-10 flex flex-wrap items-center gap-3 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          {person.podcasts.length > 0 && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <MicrophoneIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-300">
                {person.podcasts.length}
              </span>
              <span className="text-xs text-neutral-500">podcasts</span>
            </div>
          )}

          {hasEpisodes && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <svg viewBox="0 0 16 16" className="w-4 h-4 text-spotify" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.669 11.538a.498.498 0 0 1-.686.166c-1.879-1.148-4.243-1.408-7.028-.771a.499.499 0 0 1-.222-.973c3.048-.696 5.662-.397 7.77.892a.5.5 0 0 1 .166.686zm.979-2.178a.624.624 0 0 1-.858.205c-2.15-1.321-5.428-1.704-7.972-.932a.625.625 0 0 1-.362-1.194c2.905-.881 6.517-.454 8.986 1.063a.624.624 0 0 1 .206.858zm.084-2.268C10.154 5.56 5.9 5.419 3.438 6.166a.748.748 0 1 1-.434-1.432c2.825-.857 7.523-.692 10.492 1.07a.747.747 0 1 1-.764 1.288z" />
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {episodes.length}
              </span>
              <span className="text-xs text-neutral-500">episodes</span>
            </div>
          )}

          {hasPapers && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {person.papers!.length}
              </span>
              <span className="text-xs text-neutral-500">papers</span>
            </div>
          )}

          {hasGitHub && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-400" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {formatNumber(enriched.github!.totalStars)}
              </span>
              <span className="text-xs text-neutral-500">stars</span>
            </div>
          )}

          {hasHuggingFace && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {formatNumber(enriched.huggingface!.totalDownloads)}
              </span>
              <span className="text-xs text-neutral-500">model downloads</span>
            </div>
          )}

          {enriched.github?.profile && enriched.github.profile.followers > 0 && (
            <div className="stat-glass flex items-center gap-2.5 px-5 py-2.5 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm font-medium text-neutral-300">
                {formatNumber(enriched.github.profile.followers)}
              </span>
              <span className="text-xs text-neutral-500">followers</span>
            </div>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-white/[0.08] hidden sm:block" />

          {person.github && (
            <a
              href={`https://github.com/${person.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.14] transition-all duration-200 group"
            >
              <GitHubIcon className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors duration-200" />
              <span className="text-sm text-neutral-400 group-hover:text-white transition-colors duration-200">
                {person.github}
              </span>
              <ExternalLinkIcon className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-colors duration-200" />
            </a>
          )}
        </div>

        {/* ── Podcast Appearances (Spotify episodes) ──────── */}
        {hasEpisodes && (
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-spotify flex items-center justify-center shadow-xl shadow-spotify/30 hover:scale-105 hover:shadow-spotify/40 transition-all duration-200 cursor-pointer animate-pulse-glow">
                <svg
                  viewBox="0 0 16 16"
                  className="w-5 h-5 text-black ml-0.5"
                  fill="currentColor"
                >
                  <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Podcast Appearances
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {episodes.length} {episodes.length === 1 ? "episode" : "episodes"} on Spotify
                </p>
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 py-2 mb-1 text-[11px] uppercase tracking-wider text-neutral-600 font-medium">
              <div className="w-6 flex-shrink-0">#</div>
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1">Title</div>
              <div className="flex-shrink-0 hidden sm:block w-24">Date</div>
              <div className="flex-shrink-0 w-12 text-right">Dur.</div>
            </div>
            <div className="h-px bg-white/[0.06] mb-1" />

            <div className="space-y-0.5">
              {episodes.map((ep, i) => (
                <a
                  key={ep.spotify_id}
                  href={ep.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/[0.05] transition-all duration-200 group cursor-pointer track-row animate-row-enter"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Track number / play icon */}
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-neutral-500 tabular-nums group-hover:hidden">
                      {i + 1}
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      className="w-4 h-4 text-white hidden group-hover:block"
                      fill="currentColor"
                    >
                      <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
                    </svg>
                  </div>

                  {/* Episode artwork */}
                  {ep.image ? (
                    <img
                      src={ep.image}
                      alt={ep.show_name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.08] transition-colors duration-200">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-neutral-500 group-hover:text-spotify transition-colors duration-200"
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
                    </div>
                  )}

                  {/* Episode info */}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors duration-200 line-clamp-1">
                      {ep.name}
                    </span>
                    <span className="text-xs text-neutral-500 line-clamp-1">
                      {ep.show_name}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-neutral-500 flex-shrink-0 hidden sm:block">
                    {ep.release_date}
                  </span>

                  {/* Duration */}
                  <span className="text-xs text-neutral-500 tabular-nums flex-shrink-0 w-12 text-right">
                    {ep.duration_min} min
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Research Papers ─────────────────────────────── */}
        {hasPapers && (
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-white/[0.07] flex items-center justify-center shadow-xl border border-white/[0.08]">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Research Papers</h2>
              <span className="text-sm text-neutral-500">
                {person.papers!.length} {person.papers!.length === 1 ? "paper" : "papers"}
              </span>
            </div>

            <div className="space-y-3">
              {person.papers!.map((paper, i) => (
                <a
                  key={paper.arxiv}
                  href={`https://arxiv.org/abs/${paper.arxiv}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group animate-row-enter"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[11px] font-mono font-semibold text-red-400 tracking-wide">
                      arXiv
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors duration-200 leading-snug">
                        {paper.title}
                      </span>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                        <span className="font-mono">{paper.arxiv}</span>
                        <span>·</span>
                        <span>{paper.date}</span>
                      </div>
                    </div>
                    <ExternalLinkIcon className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 flex-shrink-0 mt-1 transition-colors duration-200" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Deep Research ────────────────────────────────── */}
        {hasResearch && (
          <>
            <ResearchBio research={research} />
            <ResearchSocial research={research} />
            <ResearchTimeline research={research} />
            <ResearchContributions research={research} />
            <ResearchQuotes research={research} />
            <ResearchSources research={research} />
          </>
        )}

        {/* ── Empty State ─────────────────────────────────── */}
        {!hasContentSections && (
          <div
            className="mt-16 glass-card px-8 py-10 text-center animate-fade-in-up"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
            <p className="text-neutral-400 text-sm">
              More content coming soon
            </p>
            <p className="text-neutral-600 text-xs mt-2">
              Episode data, research, and more will appear here as they become available.
            </p>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="mt-24 mb-16">
          <div className="gradient-divider mb-10" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-sm">
              <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${gradient} shadow-lg`} />
              <span className="text-neutral-500">{category.title}</span>
              <span className="text-neutral-700">/</span>
              <span className="text-neutral-400 font-medium">{person.name}</span>
            </div>
            <Link
              href="/"
              className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r ${gradient} text-white text-sm font-semibold shadow-lg shadow-black/30 hover:shadow-xl hover:scale-[1.03] transition-all duration-200 group`}
            >
              <svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-200"
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
