/**
 * skeleton.tsx — Self-contained shimmer skeleton system
 *
 * All animation keyframes are injected via an inline <style> tag, so this
 * module has zero dependency on globals.css keyframes and works correctly
 * in any rendering context (Server Components, Suspense, Streaming SSR).
 *
 * Design tokens mirror the app dark theme:
 *   base    #0B0B0F
 *   surface #141418
 *   raised  #16161D  ← shimmer trough colour
 */

import React from "react";
import { css, cx } from "styled-system/css";

/* ─── Keyframe injection ──────────────────────────────────────────────────── */

const SWEEP_KEYFRAMES = `
@keyframes sk-sweep {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
`;

/**
 * Injects the sweep keyframe once per render tree.
 * Next.js dedupes identical <style> tags during SSR; browsers ignore
 * duplicate rule-sets, so rendering this in every composed skeleton is safe.
 */
function SweepKeyframes() {
  return <style dangerouslySetInnerHTML={{ __html: SWEEP_KEYFRAMES }} />;
}

/* ─── Shimmer style factory ───────────────────────────────────────────────── */

/**
 * Returns the inline `style` object that produces the shimmer sweep.
 *
 * Gradient spec (as required):
 *   background: linear-gradient(90deg, #16161D 0%, rgba(255,255,255,0.04) 50%, #16161D 100%)
 *   background-size: 200% 100%
 * animated with a left-to-right sweep via `sk-sweep`.
 */
function shimmer(delayMs = 0): React.CSSProperties {
  return {
    background:
      "linear-gradient(90deg, #16161D 0%, rgba(255,255,255,0.04) 50%, #16161D 100%)",
    backgroundSize: "200% 100%",
    animation: `sk-sweep 1.6s ease-in-out ${delayMs}ms infinite`,
  };
}

/* ─── Base primitive ──────────────────────────────────────────────────────── */

export interface SkeletonProps {
  /** Panda CSS classes — controls size, border-radius, margins, etc. */
  className?: string;
  /** Merged on top of the shimmer base — use for explicit width/height values. */
  style?: React.CSSProperties;
  /** Animation start delay in ms for staggered children. */
  delay?: number;
}

/**
 * `Skeleton` — atomic shimmer building block.
 *
 * Every composed skeleton (StoryCardSkeleton, ProfileHeroSkeleton, …) is
 * assembled from this single primitive plus layout divs.
 *
 * @example
 *   <Skeleton className={css({ h: '4', w: 'full', rounded: 'md' })} delay={80} />
 */
export function Skeleton({ className = "", style, delay = 0 }: SkeletonProps) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({ rounded: 'md' }), className)}
        style={{ ...shimmer(delay), ...style }}
        aria-hidden="true"
      />
    </>
  );
}

/* ─── StoryCardSkeleton ───────────────────────────────────────────────────── */

/**
 * Pixel-faithful loading placeholder for `<StoryCard>`.
 *
 * Hierarchy mirrors the live component:
 *   1. Circular avatar — 96 px, centred, ringed
 *   2. Quote block — 3 text lines with left indent (pl-4) + staggered widths
 *   3. Thin divider (border-t border-white/[0.04])
 *   4. Name bar + role·org bar, left-aligned, below divider
 *   5. Two pill placeholders — podcast count + knownFor badge
 */
export function StoryCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({
          pos: 'relative', display: 'block', textAlign: 'center',
          bg: 'card.bg', rounded: '2xl', borderWidth: '1px',
          borderColor: 'card.border',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', p: '4',
        }), className)}
        aria-busy="true"
        aria-label="Loading profile card"
      >
        {/* ── Avatar (96 px) ──────────────────────────────── */}
        <div className={css({ display: 'flex', justifyContent: 'center', mb: '4' })}>
          {/*
            Replicates the ring-1 ring-white/[0.07] p-[2px] wrapper
            the real card uses around the <Image /> element.
          */}
          <div
            className={css({ rounded: 'full', p: '2px' })}
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }}
          >
            <div
              className={css({ rounded: 'full', flexShrink: 0 })}
              style={{ width: 96, height: 96, ...shimmer(0) }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Quote block ─────────────────────────────────── */}
        {/*
          The real card wraps its <p> in a `relative` div with `pl-4`.
          We replicate that indent so the skeleton matches the live layout
          at all breakpoints without any bespoke sizing.
        */}
        <div className={css({ pos: 'relative', mb: '4', textAlign: 'left', pl: '4', display: 'flex', flexDir: 'column', gap: '10px' })}>
          <div className={css({ h: '14px', w: 'full', rounded: 'md' })}  style={shimmer(0)}   aria-hidden="true" />
          <div className={css({ h: '14px', w: '88%', rounded: 'md' })}   style={shimmer(60)}  aria-hidden="true" />
          <div className={css({ h: '14px', w: '72%', rounded: 'md' })}   style={shimmer(120)} aria-hidden="true" />
        </div>

        {/* ── Divider + name / role ────────────────────────── */}
        <div className={css({ mb: '3', pt: '3', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.04)', textAlign: 'left', display: 'flex', flexDir: 'column', gap: '9px' })}>
          {/* Name — font-semibold text-[0.9375rem] → h-[15px], ~62 % */}
          <div className={css({ h: '15px', w: '62%', rounded: 'md' })} style={shimmer(80)}  aria-hidden="true" />
          {/* Role | Org — text-sm → h-[13px], ~44 % */}
          <div className={css({ h: '13px', w: '44%', rounded: 'md' })} style={shimmer(140)} aria-hidden="true" />
        </div>

        {/* ── Pills ───────────────────────────────────────── */}
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5', mt: '1', textAlign: 'left' })}>
          {/* Podcast count pill — matches `px-2.5 py-1 rounded-full` */}
          <div
            className={css({ h: '1.625rem', w: '5.5rem', rounded: 'full' })}
            style={shimmer(100)}
            aria-hidden="true"
          />
          {/* knownFor badge — purple-tinted to echo the live `bg-[rgba(139,92,246,0.08)]` */}
          <div
            className={css({ h: '1.625rem', w: '6.5rem', rounded: 'full' })}
            style={{
              background:
                "linear-gradient(90deg, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.13) 50%, rgba(139,92,246,0.07) 100%)",
              backgroundSize: "200% 100%",
              animation: "sk-sweep 1.6s ease-in-out 160ms infinite",
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}

/* ─── ProfileHeroSkeleton ─────────────────────────────────────────────────── */

/**
 * Loading placeholder for the person page hero section.
 *
 * Mirrors the live layout:
 *   [120 px avatar] [category badge | h1 name | role·org | description (3 lines)]
 *
 * Followed by a horizontal quick-info bar of stat chips and a GitHub link chip,
 * separated by a `h-px bg-white/[0.06]` divider (same as the real page).
 */
export function ProfileHeroSkeleton({ className = "" }: { className?: string }) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={className}
        aria-busy="true"
        aria-label="Loading profile"
      >
        {/* ── Hero flex row ──────────────────────────────────── */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '6', pb: '8' })}>

          {/* Large avatar — 120 px, `border-2 border-white/[0.08]` ring */}
          <div
            className={css({ flexShrink: 0, rounded: 'full', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.08)' })}
            style={{ width: 120, height: 120, ...shimmer(0) }}
            aria-hidden="true"
          />

          {/* Text column */}
          <div className={css({ display: 'flex', flexDir: 'column', gap: '9px', minW: '0', flex: '1' })}>
            {/* Category badge — narrow pill (`text-[10px] … px-3 py-0.5 rounded-full`) */}
            <div
              className={css({ alignSelf: 'flex-start', h: '5', w: '76px', rounded: 'full' })}
              style={shimmer(40)}
              aria-hidden="true"
            />

            {/* h1 name — `text-4xl font-black` → h-9, fixed 200 px */}
            <div
              className={css({ h: '9', rounded: 'lg' })}
              style={{ width: 200, ...shimmer(80) }}
              aria-hidden="true"
            />

            {/* role | org — `text-sm` → h-[13px], fixed 140 px */}
            <div
              className={css({ h: '13px', rounded: 'md' })}
              style={{ width: 140, ...shimmer(120) }}
              aria-hidden="true"
            />

            {/* Description — 3 lines, narrowing (`text-sm leading-relaxed max-w-xl`) */}
            <div className={css({ mt: '0.5', display: 'flex', flexDir: 'column', gap: '8px' })}>
              <div className={css({ h: '13px', w: 'full', maxW: 'xl', rounded: 'md' })}   style={shimmer(160)} aria-hidden="true" />
              <div className={css({ h: '13px', w: '88%', maxW: 'lg', rounded: 'md' })}    style={shimmer(200)} aria-hidden="true" />
              <div className={css({ h: '13px', w: '68%', maxW: 'md', rounded: 'md' })}    style={shimmer(240)} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* ── Horizontal rule ───────────────────────────────── */}
        <div className={css({ h: '1px', bg: 'card.border' })} />

        {/* ── Quick-info bar ────────────────────────────────── */}
        {/*
          Mirrors `mt-8 flex flex-wrap items-center gap-2.5` with stat chips
          (`px-5 py-2.5 rounded-xl bg-[#141418]`) + a divider + a GitHub link chip.
        */}
        <div className={css({ mt: '8', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2.5' })}>
          {/* Three stat chips */}
          <div className={css({ h: '10', w: '108px', rounded: 'xl' })} style={shimmer(100)} aria-hidden="true" />
          <div className={css({ h: '10', w: '100px', rounded: 'xl' })} style={shimmer(160)} aria-hidden="true" />
          <div className={css({ h: '10', w: '116px', rounded: 'xl' })} style={shimmer(220)} aria-hidden="true" />

          {/* Vertical divider */}
          <div className={css({ w: '1px', h: '6', bg: 'rgba(255,255,255,0.08)', display: 'none', sm: { display: 'block' } })} />

          {/* GitHub link chip */}
          <div className={css({ h: '10', w: '140px', rounded: 'xl' })} style={shimmer(280)} aria-hidden="true" />
        </div>
      </div>
    </>
  );
}

/* ─── Legacy primitives (kept for backward-compat) ───────────────────────── */

/**
 * Low-level shimmer div. Prefer `Skeleton` for new usage.
 * Kept so import sites that use `<Shimmer className="…" style={…} />` continue
 * to compile without changes.
 */
export function Shimmer({
  className = "",
  style,
  delay = 0,
}: {
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({ rounded: 'md' }), className)}
        style={{ ...shimmer(delay), ...style }}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Multi-line text block skeleton with staggered widths.
 * Accepts an optional `baseDelay` so the whole block can be offset
 * relative to sibling elements.
 */
export function SkeletonText({
  lines = 3,
  className = "",
  baseDelay = 0,
}: {
  lines?: number;
  className?: string;
  baseDelay?: number;
}) {
  const widths = ["full", "92%", "85%", "80%", "60%"] as const;
  return (
    <>
      <SweepKeyframes />
      <div className={cx(css({ display: 'flex', flexDir: 'column', gap: '2.5' }), className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={css({ h: '3.5', rounded: 'md', w: widths[Math.min(i, widths.length - 1)] })}
            style={shimmer(baseDelay + i * 80)}
            aria-hidden="true"
          />
        ))}
      </div>
    </>
  );
}

/** Circular avatar placeholder. */
export function SkeletonAvatar({
  size = 96,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({ rounded: 'full', flexShrink: 0 }), className)}
        style={{ width: size, height: size, ...shimmer(0), ...style }}
        aria-hidden="true"
      />
    </>
  );
}

/** Rounded-full pill placeholder. */
export function SkeletonPill({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({ h: '7', w: '20', rounded: 'full' }), className)}
        style={{ ...shimmer(0), ...style }}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * Full StoryCard-shaped skeleton.
 * `SkeletonCard` is now an alias for `StoryCardSkeleton`.
 * Accepts the legacy `delay` prop — the whole card's shimmer phase is offset
 * by that many ms so a grid can stagger cards.
 */
export function SkeletonCard({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  /*
   * For true per-card stagger support we clone StoryCardSkeleton's markup
   * inline here, applying `delay` to every element, rather than wrapping
   * StoryCardSkeleton (which hard-codes delay=0 for all its children).
   */
  return (
    <>
      <SweepKeyframes />
      <div
        className={cx(css({
          pos: 'relative', display: 'block', textAlign: 'center',
          bg: 'card.bg', rounded: '2xl', borderWidth: '1px',
          borderColor: 'card.border',
          shadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', p: '4',
        }), className)}
        aria-busy="true"
        aria-label="Loading profile card"
      >
        {/* Avatar */}
        <div className={css({ display: 'flex', justifyContent: 'center', mb: '4' })}>
          <div
            className={css({ rounded: 'full', p: '2px' })}
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }}
          >
            <div
              className={css({ rounded: 'full', flexShrink: 0 })}
              style={{ width: 96, height: 96, ...shimmer(delay) }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Quote lines */}
        <div className={css({ pos: 'relative', mb: '4', textAlign: 'left', pl: '4', display: 'flex', flexDir: 'column', gap: '10px' })}>
          <div className={css({ h: '14px', w: 'full', rounded: 'md' })}  style={shimmer(delay)}        aria-hidden="true" />
          <div className={css({ h: '14px', w: '88%', rounded: 'md' })}   style={shimmer(delay + 60)}   aria-hidden="true" />
          <div className={css({ h: '14px', w: '72%', rounded: 'md' })}   style={shimmer(delay + 120)}  aria-hidden="true" />
        </div>

        {/* Divider + name / role */}
        <div className={css({ mb: '3', pt: '3', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.04)', textAlign: 'left', display: 'flex', flexDir: 'column', gap: '9px' })}>
          <div className={css({ h: '15px', w: '62%', rounded: 'md' })} style={shimmer(delay + 200)} aria-hidden="true" />
          <div className={css({ h: '13px', w: '44%', rounded: 'md' })} style={shimmer(delay + 260)} aria-hidden="true" />
        </div>

        {/* Pills */}
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5', mt: '1', textAlign: 'left' })}>
          <div
            className={css({ h: '1.625rem', w: '5.5rem', rounded: 'full' })}
            style={shimmer(delay + 320)}
            aria-hidden="true"
          />
          <div
            className={css({ h: '1.625rem', w: '6.5rem', rounded: 'full' })}
            style={{
              background:
                "linear-gradient(90deg, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.13) 50%, rgba(139,92,246,0.07) 100%)",
              backgroundSize: "200% 100%",
              animation: `sk-sweep 1.6s ease-in-out ${delay + 360}ms infinite`,
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}

/** A stat-card shaped skeleton for dashboard pages. */
export function SkeletonStatCard({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <>
      <SweepKeyframes />
      <div className={cx(css({ rounded: 'xl', bg: 'card.bg', borderWidth: '1px', borderColor: 'card.border', p: '6' }), className)}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '3' })}>
          <div className={css({ h: '9', w: '9', rounded: 'lg' })}  style={shimmer(delay)}       aria-hidden="true" />
          <div className={css({ h: '3', w: '20', rounded: 'md' })} style={shimmer(delay + 50)} aria-hidden="true" />
        </div>
        <div className={css({ h: '8', w: '20', rounded: 'lg' })} style={shimmer(delay + 100)} aria-hidden="true" />
      </div>
    </>
  );
}

/** A horizontal bar-chart row skeleton. */
export function SkeletonBarRow({
  width,
  delay = 0,
}: {
  width: string;
  delay?: number;
}) {
  return (
    <>
      <SweepKeyframes />
      <div>
        <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '1.5' })}>
          <div className={css({ h: '3.5', w: '24', rounded: 'md' })} style={shimmer(delay)}       aria-hidden="true" />
          <div className={css({ h: '3', w: '14', rounded: 'md' })}   style={shimmer(delay + 40)}  aria-hidden="true" />
        </div>
        <div className={css({ h: '2', rounded: 'full', bg: 'rgba(255,255,255,0.03)', overflow: 'hidden' })}>
          <div
            className={css({ h: 'full', rounded: 'full' })}
            style={{ width, ...shimmer(delay + 80) }}
            aria-hidden="true"
          />
        </div>
      </div>
    </>
  );
}

/** A list-row skeleton (rank + name + value) for leaderboards. */
export function SkeletonListRow({ delay = 0 }: { delay?: number }) {
  return (
    <>
      <SweepKeyframes />
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
        <div className={css({ w: '5', h: '5', rounded: 'full', flexShrink: 0 })} style={shimmer(delay)}       aria-hidden="true" />
        <div className={css({ h: '3.5', flex: '1', minW: '0', rounded: 'md' })}  style={shimmer(delay + 40)}  aria-hidden="true" />
        <div className={css({ h: '3.5', w: '10', flexShrink: 0, rounded: 'md' })} style={shimmer(delay + 80)}  aria-hidden="true" />
      </div>
    </>
  );
}

/**
 * @deprecated No longer needed — keyframes are injected inline.
 * Kept as a no-op export so import sites compile without changes.
 */
export function ShimmerKeyframes() {
  return null;
}
