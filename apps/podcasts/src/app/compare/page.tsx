"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAllPersonalities, getAvatarUrl, getInitials } from "@/lib/personalities";
import { css, cx } from "styled-system/css";

import type { Personality } from "@/lib/personalities/types";
import type { EnrichedData } from "@/lib/enrichment";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/* ── Icon helpers ─────────────────────────────────────────────── */

const iconSmStyle = css({ w: '3.5', h: '3.5' });

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="currentColor" aria-hidden="true">
      <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L3.22 9.03a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 1.06L5.56 7.75h6.69a.75.75 0 0 1 0 1.5H5.56l2.22 2.22a.75.75 0 0 1 0 1.06z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" className={css({ w: '4', h: '4', flexShrink: 0 })} fill="currentColor" aria-hidden="true">
      <path d="M4.427 6.427a.75.75 0 0 1 1.06 0L8 8.94l2.513-2.513a.75.75 0 1 1 1.06 1.06l-3.042 3.044a.75.75 0 0 1-1.061 0L4.427 7.488a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1a2 2 0 0 0-2 2v5a2 2 0 0 0 4 0V3a2 2 0 0 0-2-2z" />
      <path d="M13 7v1a5 5 0 0 1-10 0V7" />
      <line x1="8" y1="13" x2="8" y2="15" />
      <line x1="5.5" y1="15" x2="10.5" y2="15" />
    </svg>
  );
}

function PaperIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V6L9 1z" />
      <polyline points="9 1 9 6 14 6" />
      <line x1="5" y1="9" x2="11" y2="9" />
      <line x1="5" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="currentColor" aria-hidden="true">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
    </svg>
  );
}

function FollowersIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="currentColor" aria-hidden="true">
      <path d="M5.5 3.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0ZM8 1a2.5 2.5 0 1 0 0 5A2.5 2.5 0 0 0 8 1ZM1.5 14.25c0-3.176 2.567-5.75 5.75-5.75 1.232 0 2.37.37 3.314 1.003l-1.15 1.15A4.25 4.25 0 0 0 7.25 10 4.25 4.25 0 0 0 3 14.25v.75a.75.75 0 0 1-1.5 0v-.75Z" />
      <path d="M12.5 13.5a.5.5 0 0 1-1 0v-2h-2a.5.5 0 0 1 0-1h2v-2a.5.5 0 0 1 1 0v2h2a.5.5 0 0 1 0 1h-2v2Z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconSmStyle} fill="currentColor" aria-hidden="true">
      <path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25Zm6.56 0a.75.75 0 1 0-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06L11.28 3.22Z" />
    </svg>
  );
}

/* ── Types ────────────────────────────────────────────────────── */

type PersonEnrichment = {
  personality: Personality;
  enrichment: EnrichedData;
};

/* ── Stat comparison helpers ──────────────────────────────────── */

type StatHighlight = "higher" | "lower" | "equal" | "na";

function getDiff(left: number, right: number): { left: StatHighlight; right: StatHighlight } {
  if (left === 0 && right === 0) return { left: "na", right: "na" };
  if (left > right) return { left: "higher", right: "lower" };
  if (right > left) return { left: "lower", right: "higher" };
  return { left: "equal", right: "equal" };
}

function statBgStyle(h: StatHighlight) {
  switch (h) {
    case "higher":
      return { bg: 'rgba(29,185,84,0.08)', borderColor: 'rgba(29,185,84,0.18)' } as const;
    case "lower":
      return { bg: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' } as const;
    case "equal":
      return { bg: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' } as const;
    default:
      return { bg: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' } as const;
  }
}

function statValueColorVal(h: StatHighlight): string {
  return h === "higher" ? '#1DB954' : '#E8E8ED';
}

/* ── Sub-components ───────────────────────────────────────────── */

function PersonSelector({
  value,
  onChange,
  allPersonalities,
  otherSlug,
  label,
}: {
  value: string;
  onChange: (slug: string) => void;
  allPersonalities: Personality[];
  otherSlug: string;
  label: string;
}) {
  return (
    <div className={css({ pos: 'relative' })}>
      <label className={css({ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'medium', color: '#5A5A65', mb: '1.5' })}>
        {label}
      </label>
      <div className={css({ pos: 'relative' })}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={css({ w: 'full', appearance: 'none', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', rounded: 'xl', px: '4', py: '3', pr: '10', fontSize: 'sm', color: '#E8E8ED', cursor: 'pointer', transition: 'colors', _hover: { borderColor: 'rgba(255,255,255,0.14)' }, _focus: { outline: 'none', borderColor: 'rgba(139,92,246,0.5)', ringWidth: '2px', ringColor: 'rgba(139,92,246,0.3)' } })}
        >
          {allPersonalities.map((p) => (
            <option
              key={p.slug}
              value={p.slug}
              disabled={p.slug === otherSlug}
              style={{ backgroundColor: '#141418', color: '#E8E8ED', ...(p.slug === otherSlug ? { opacity: 0.4 } : {}) }}
            >
              {p.name} — {p.role}, {p.org}
            </option>
          ))}
        </select>
        <span className={css({ pointerEvents: 'none', pos: 'absolute', right: '3.5', top: '50%', transform: 'translateY(-50%)', color: '#5A5A65' })}>
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );
}

function Avatar({ personality }: { personality: Personality }) {
  const avatar = getAvatarUrl(personality);
  const initials = getInitials(personality.name);
  return avatar ? (
    <Image
      src={avatar}
      alt={`${personality.name}`}
      width={72}
      height={72}
      unoptimized
      className={css({ rounded: 'full', objectFit: 'cover', ringWidth: '2px', ringColor: 'rgba(255,255,255,0.08)' })}
      style={{ width: 72, height: 72 }}
    />
  ) : (
    <div
      className={css({ rounded: 'full', bg: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B8B96', fontWeight: 'semibold', fontSize: 'xl', ringWidth: '2px', ringColor: 'rgba(255,255,255,0.08)' })}
      style={{ width: 72, height: 72 }}
      role="img"
      aria-label={personality.name}
    >
      {initials}
    </div>
  );
}

function PanelHeader({ person }: { person: PersonEnrichment }) {
  const { personality } = person;
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '5', p: { base: '5', md: '6' }, borderBottomWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
      <Avatar personality={personality} />
      <div className={css({ minW: '0' })}>
        <Link
          href={`/person/${personality.slug}`}
          className={css({ display: 'block', fontSize: 'base', fontWeight: 'semibold', color: '#E8E8ED', lineHeight: 'tight', letterSpacing: '-0.01em', transition: 'colors', truncate: true, _hover: { color: '#A78BFA' } })}
        >
          {personality.name}
        </Link>
        <p className={css({ fontSize: 'sm', color: '#7B7B86', mt: '0.5', lineHeight: 'snug', truncate: true })}>
          {personality.role}
          <span className={css({ mx: '1.5', color: 'rgba(255,255,255,0.2)', fontWeight: 'light' })}>|</span>
          {personality.org}
        </p>
        {personality.knownFor && (
          <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1', mt: '1.5', fontSize: '10px', fontWeight: 'medium', letterSpacing: '0.02em', px: '2', py: '0.5', rounded: 'full', bg: 'rgba(139,92,246,0.08)', color: '#a78bfa', borderWidth: '1px', borderColor: 'rgba(139,92,246,0.15)' })}>
            {personality.knownFor}
          </span>
        )}
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  highlight,
  display,
}: {
  icon: React.ReactNode;
  label: string;
  highlight: StatHighlight;
  display: string;
}) {
  const bgStyles = statBgStyle(highlight);
  return (
    <div
      className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', rounded: 'xl', borderWidth: '1px', px: '5', py: '3.5', transition: 'colors', ...bgStyles })}
    >
      <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5', color: '#7B7B86' })}>
        {icon}
        <span className={css({ fontSize: 'xs', fontWeight: 'medium', color: '#9B9BA6' })}>{label}</span>
      </div>
      <span className={css({ fontSize: 'sm', fontWeight: 'semibold', fontVariantNumeric: 'tabular-nums', color: statValueColorVal(highlight) })}>
        {display}
      </span>
    </div>
  );
}

/* ── Panel (one side of the comparison) ───────────────────────── */

function ComparePanel({
  person,
  stats,
  side,
}: {
  person: PersonEnrichment;
  stats: {
    label: string;
    icon: React.ReactNode;
    leftDisplay: string;
    rightDisplay: string;
    leftHighlight: StatHighlight;
    rightHighlight: StatHighlight;
  }[];
  side: "left" | "right";
}) {
  const { personality } = person;
  const podcastCount = personality.podcasts.length;

  return (
    <div className={css({ bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', rounded: '2xl', overflow: 'hidden', display: 'flex', flexDir: 'column' })}>
      {/* Header */}
      <PanelHeader person={person} />

      {/* Description */}
      <div className={css({ px: { base: '5', md: '6' }, py: '5', borderBottomWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
        <p className={css({ fontSize: 'sm', color: '#7B7B86', lineHeight: 'relaxed', lineClamp: 3 })}>
          {personality.description}
        </p>
      </div>

      {/* Podcasts section */}
      <div className={css({ px: { base: '5', md: '6' }, py: '5', borderBottomWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
        <p className={css({ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'medium', color: '#5A5A65', mb: '2.5' })}>
          Podcast Appearances
        </p>
        {podcastCount > 0 ? (
          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
            {personality.podcasts.map((pod) => (
              <span
                key={pod}
                className={css({ fontSize: 'xs', px: '2.5', py: '1', rounded: 'full', bg: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.07)', color: '#9B9BA6' })}
              >
                {pod}
              </span>
            ))}
          </div>
        ) : (
          <p className={css({ fontSize: 'xs', color: '#7B7B86' })}>No podcast data</p>
        )}
      </div>

      {/* Stats */}
      <div className={css({ px: { base: '5', md: '6' }, py: '5', display: 'flex', flexDir: 'column', gap: '3', flex: '1' })}>
        <p className={css({ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'medium', color: '#5A5A65', mb: '1' })}>
          Stats
        </p>
        {stats.map((s) => (
          <StatRow
            key={s.label}
            icon={s.icon}
            label={s.label}
            highlight={side === "left" ? s.leftHighlight : s.rightHighlight}
            display={side === "left" ? s.leftDisplay : s.rightDisplay}
          />
        ))}
      </div>

      {/* Footer link */}
      <div className={css({ px: '6', pb: '6', pt: '3' })}>
        <Link
          href={`/person/${personality.slug}`}
          className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2', w: 'full', rounded: 'xl', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', py: '2.5', fontSize: 'xs', fontWeight: 'medium', color: '#7B7B86', transition: 'all', transitionDuration: '200ms', _hover: { color: '#E8E8ED', borderColor: 'rgba(255,255,255,0.14)', bg: 'rgba(255,255,255,0.03)' } })}
        >
          View full profile
          <svg viewBox="0 0 16 16" className={css({ w: '3', h: '3' })} fill="currentColor" aria-hidden="true">
            <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.042-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

// getEnrichment reads from the filesystem — safe in client components
// only if called server-side. We pre-load all enrichment data at module
// level so the client bundle can access it without filesystem calls.
// For a full production build this would be passed as props from a server
// component; here we load it once per selection via a small memoised map.

const ALL_PERSONALITIES = getAllPersonalities();

const ENRICHMENT_CACHE = new Map<string, EnrichedData>();

function loadEnrichment(slug: string): EnrichedData {
  if (!ENRICHMENT_CACHE.has(slug)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const raw = require(`@/lib/enrichment/${slug}.json`) as EnrichedData;
      ENRICHMENT_CACHE.set(slug, raw);
    } catch {
      ENRICHMENT_CACHE.set(slug, { github: null, huggingface: null, imageUrl: null });
    }
  }
  return ENRICHMENT_CACHE.get(slug)!;
}

export default function ComparePage() {
  const defaults = ALL_PERSONALITIES.slice(0, 2);
  const [leftSlug, setLeftSlug] = useState(defaults[0]?.slug ?? "");
  const [rightSlug, setRightSlug] = useState(defaults[1]?.slug ?? "");

  const leftPerson = useMemo<PersonEnrichment | null>(() => {
    const p = ALL_PERSONALITIES.find((x) => x.slug === leftSlug);
    if (!p) return null;
    return { personality: p, enrichment: loadEnrichment(leftSlug) };
  }, [leftSlug]);

  const rightPerson = useMemo<PersonEnrichment | null>(() => {
    const p = ALL_PERSONALITIES.find((x) => x.slug === rightSlug);
    if (!p) return null;
    return { personality: p, enrichment: loadEnrichment(rightSlug) };
  }, [rightSlug]);

  /* ── Derived stat values ───────────────────────────────────── */

  const statDefs = useMemo(() => {
    if (!leftPerson || !rightPerson) return [];

    const lp = leftPerson.personality;
    const rp = rightPerson.personality;
    const le = leftPerson.enrichment;
    const re = rightPerson.enrichment;

    const rows: {
      label: string;
      icon: React.ReactNode;
      leftDisplay: string;
      rightDisplay: string;
      leftHighlight: StatHighlight;
      rightHighlight: StatHighlight;
    }[] = [];

    // Helper: build a numeric row with automatic higher/lower diff
    function numericRow(
      label: string,
      icon: React.ReactNode,
      lVal: number,
      rVal: number,
      fmt: (n: number) => string,
    ) {
      const diff = getDiff(lVal, rVal);
      const bothZero = lVal === 0 && rVal === 0;
      rows.push({
        label,
        icon,
        leftDisplay: lVal > 0 ? fmt(lVal) : "\u2014",
        rightDisplay: rVal > 0 ? fmt(rVal) : "\u2014",
        leftHighlight: bothZero ? "na" : diff.left,
        rightHighlight: bothZero ? "na" : diff.right,
      });
    }

    numericRow("Podcasts", <MicIcon />, lp.podcasts.length, rp.podcasts.length, String);
    numericRow("Papers", <PaperIcon />, lp.papers?.length ?? 0, rp.papers?.length ?? 0, String);
    numericRow("GitHub Stars", <StarIcon />, le.github?.totalStars ?? 0, re.github?.totalStars ?? 0, formatNumber);
    numericRow("GH Followers", <FollowersIcon />, le.github?.profile?.followers ?? 0, re.github?.profile?.followers ?? 0, formatNumber);
    numericRow("Public Repos", <RepoIcon />, le.github?.profile?.publicRepos ?? 0, re.github?.profile?.publicRepos ?? 0, String);

    // Top language — no numeric diff, just display
    rows.push({
      label: "Top Language",
      icon: <CodeIcon />,
      leftDisplay: le.github?.languages?.[0]?.name ?? "\u2014",
      rightDisplay: re.github?.languages?.[0]?.name ?? "\u2014",
      leftHighlight: "na",
      rightHighlight: "na",
    });

    return rows;
  }, [leftPerson, rightPerson]);

  return (
    <main className={css({ minH: 'screen', bg: '#0B0B0F', color: '#E8E8ED', pt: '14' })}>
      {/* ── Page content ──────────────────────────────────────── */}
      <div className={css({ maxW: '6xl', mx: 'auto', px: { base: '5', sm: '6', md: '8' }, pt: '12', pb: { base: '20', md: '32' } })}>

        {/* ── Back link ─────────────────────────────────────── */}
        <div className={css({ mb: '10' })}>
          <Link
            href="/"
            className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', fontSize: 'xs', fontWeight: 'medium', color: '#7B7B86', transition: 'colors', _hover: { color: '#C4C4CC' } })}
          >
            <ArrowLeftIcon />
            All profiles
          </Link>
        </div>

        {/* ── Page header ───────────────────────────────────── */}
        <div className={css({ mb: '12' })}>
          <p className={css({ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'medium', color: '#5A5A65', mb: '2' })}>
            Side by side
          </p>
          <h1 className={css({ fontSize: { base: '3xl', md: '4xl' }, fontWeight: 'bold', color: '#E8E8ED', letterSpacing: '-0.02em', mb: '4' })}>
            Compare
          </h1>
          <p className={css({ fontSize: 'sm', color: '#7B7B86', maxW: 'md', lineHeight: 'relaxed' })}>
            Pick two AI leaders and compare their podcast footprint, research output, and open-source activity side by side.
          </p>
          <div className={cx("gradient-divider", css({ maxW: 'xs', mt: '8' }))} />
        </div>

        {/* ── Person selectors ──────────────────────────────── */}
        <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: { base: '4', md: '6' }, alignItems: 'flex-end', mb: '10', md: { gridTemplateColumns: '1fr auto 1fr' } })}>
          <PersonSelector
            label="Person A"
            value={leftSlug}
            onChange={setLeftSlug}
            allPersonalities={ALL_PERSONALITIES}
            otherSlug={rightSlug}
          />

          {/* VS badge */}
          <div className={css({ display: 'flex', justifyContent: 'center', pb: '0.5' })}>
            <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '8', h: '8', rounded: 'full', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '10px', fontWeight: 'bold', color: '#5A5A65', letterSpacing: 'wide', userSelect: 'none' })}>
              vs
            </span>
          </div>

          <PersonSelector
            label="Person B"
            value={rightSlug}
            onChange={setRightSlug}
            allPersonalities={ALL_PERSONALITIES}
            otherSlug={leftSlug}
          />
        </div>

        {/* ── Comparison grid ───────────────────────────────── */}
        {leftPerson && rightPerson ? (
          <div className={css({ pos: 'relative' })}>
            {/* Mobile VS divider (between stacked panels) */}
            <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: { base: '6', md: '8' }, md: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
              <ComparePanel person={leftPerson} stats={statDefs} side="left" />

              {/* Mobile VS divider */}
              <div className={css({ display: 'flex', justifyContent: 'center', alignItems: 'center', py: '2', md: { display: 'none' } })}>
                <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '8', h: '8', rounded: 'full', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '10px', fontWeight: 'bold', color: '#5A5A65', letterSpacing: 'wide', userSelect: 'none' })}>
                  vs
                </span>
              </div>

              {/* VS badge — desktop, absolutely centred between columns */}
              <div className={css({ display: 'none', pos: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none', md: { display: 'flex' } })}>
                <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '9', h: '9', rounded: 'full', bg: '#0B0B0F', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.10)', fontSize: '11px', fontWeight: 'bold', color: '#5A5A65', letterSpacing: 'wide', shadow: '0 0 0 4px rgba(11,11,15,1)', userSelect: 'none' })}>
                  vs
                </span>
              </div>

              <ComparePanel person={rightPerson} stats={statDefs} side="right" />
            </div>

            {/* ── Legend ──────────────────────────────────── */}
            <div className={css({ mt: '8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6', flexWrap: 'wrap' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                <span className={css({ w: '2.5', h: '2.5', rounded: 'full', bg: 'rgba(29,185,84,0.6)' })} />
                <span className={css({ fontSize: '11px', color: '#5A5A65' })}>Higher value</span>
              </div>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                <span className={css({ w: '2.5', h: '2.5', rounded: 'full', bg: 'rgba(255,255,255,0.1)' })} />
                <span className={css({ fontSize: '11px', color: '#5A5A65' })}>Lower / equal</span>
              </div>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                <span className={css({ w: '2.5', h: '2.5', rounded: 'full', bg: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })} />
                <span className={css({ fontSize: '11px', color: '#5A5A65' })}>Not available</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', rounded: '2xl', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', bg: '#141418', p: '16', textAlign: 'center' })}>
            <p className={css({ color: '#7B7B86', fontSize: 'sm' })}>Select two people above to compare.</p>
          </div>
        )}
      </div>
    </main>
  );
}
