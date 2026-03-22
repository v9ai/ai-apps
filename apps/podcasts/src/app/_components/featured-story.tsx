import Link from "next/link";
import { css, cx } from "styled-system/css";
import {
  getAvatarUrl,
  getInitials,
  type Personality,
} from "@/lib/personalities";

type FeaturedStoryProps = {
  personality: Personality;
  quote: string;
  categoryName: string;
};

const avatarBoxShadow = [
  "0 4px 12px -2px rgba(0,0,0,0.5)",
  "0 8px 24px -4px rgba(0,0,0,0.35)",
  "0 16px 40px -8px rgba(0,0,0,0.2)",
  "0 0 0 2px rgba(255,255,255,0.08)",
  "0 0 0 4px rgba(0,0,0,0.3)",
  "0 0 0 5px rgba(255,255,255,0.04)",
  "inset 0 2px 4px rgba(255,255,255,0.06)",
].join(", ");

/* shimmer keyframes live in globals.css (.featured-shimmer-track) */

export function FeaturedStory({
  personality,
  quote,
  categoryName,
}: FeaturedStoryProps) {
  const avatar = getAvatarUrl(personality);
  const initials = getInitials(personality.name);
  const podcastCount = personality.podcasts?.length ?? 0;

  return (
    <>
      <Link
        href={`/person/${personality.slug}`}
        className={cx("group", "featured-card", css({
          display: 'block',
          pos: 'relative',
          overflow: 'hidden',
        }))}
        style={{ animation: "fade-in 0.8s ease-out both" }}
      >
        {/* ── Subtle diagonal-line background pattern ── */}
        <div
          className={css({
            pos: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.3,
            rounded: 'inherit',
          })}
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,255,255,0.015) 10px, rgba(255,255,255,0.015) 11px)',
          }}
          aria-hidden="true"
        />

        {/* ── Hover shimmer sweep overlay (class-driven in globals.css) ── */}
        <div className="featured-shimmer-track" aria-hidden="true" />

        {/* ── Main content ── */}
        <div className={css({ pos: 'relative', zIndex: 2, py: { base: '8', sm: '10', md: '14', lg: '16' }, px: { base: '6', sm: '8', md: '10', lg: '14' } })}>

          {/* ── SPOTLIGHT label ── */}
          <div
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5',
              pos: 'absolute',
              top: { base: '4', md: '6' },
              left: { base: '4', md: '6' },
              px: '3',
              py: '1',
              rounded: 'md',
              fontSize: '0.625rem',
              fontWeight: '600',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              bg: 'rgba(167, 139, 250, 0.08)',
              borderWidth: '1px',
              borderColor: 'rgba(167, 139, 250, 0.15)',
              color: 'rgba(167, 139, 250, 0.7)',
              backdropFilter: 'blur(4px)',
            })}
            style={{ animation: 'fade-in 0.6s ease-out 0.15s both' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d="M5 0L6.12 3.88L10 5L6.12 6.12L5 10L3.88 6.12L0 5L3.88 3.88L5 0Z"
                fill="currentColor"
                fillOpacity="0.85"
              />
            </svg>
            Spotlight
          </div>

          <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: { base: '6', sm: '8', md: '8', lg: '10' }, md: { flexDir: 'row', alignItems: 'flex-start' } })}>
            {/* Portrait column */}
            <div className={css({ flexShrink: 0, display: 'flex', flexDir: 'column', alignItems: 'center', pb: '2', md: { w: '40%', pb: '0', pt: '2' } })}>
              {avatar ? (
                <img
                  src={avatar}
                  alt={personality.name}
                  width={280}
                  height={280}
                  className={css({ w: '200px', h: '200px', rounded: 'full', objectFit: 'cover', transition: 'transform', transitionDuration: '500ms', _groupHover: { transform: 'scale(1.02)' }, md: { w: '60', h: '60' }, lg: { w: '280px', h: '280px' } })}
                  style={{ boxShadow: avatarBoxShadow }}
                />
              ) : (
                <div
                  className={css({ w: '200px', h: '200px', rounded: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center', bg: '#1C1C22', transition: 'transform', transitionDuration: '500ms', _groupHover: { transform: 'scale(1.02)' }, md: { w: '60', h: '60' }, lg: { w: '280px', h: '280px' } })}
                  style={{ boxShadow: avatarBoxShadow }}
                >
                  <span className={css({ fontSize: '4xl', fontWeight: 'bold', color: '#7B7B86', userSelect: 'none', md: { fontSize: '5xl' }, lg: { fontSize: '6xl' } })}>
                    {initials}
                  </span>
                </div>
              )}
              <span className={css({ mt: '6', rounded: 'full', px: '4', py: '1.5', fontSize: 'xs', fontWeight: 'medium', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8B8B96', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' })}>
                {categoryName}
              </span>
            </div>

            {/* Quote + info column */}
            <div className={css({ display: 'flex', flexDir: 'column', justifyContent: 'center', textAlign: 'center', md: { w: '60%', textAlign: 'left', py: '4' } })}>
              <blockquote
                className={css({ pos: 'relative', pl: { base: '6', sm: '8', md: '9' } })}
                style={{ animation: 'fade-in-up 0.7s ease-out 0.3s both' }}
              >
                {/* ── Gradient quote mark ── */}
                <span
                  className={css({
                    pos: 'absolute',
                    top: '-0.5rem',
                    left: '-0.25rem',
                    fontSize: '4.5rem',
                    lineHeight: 'none',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    fontWeight: 'bold',
                    backgroundClip: 'text',
                    color: 'transparent',
                    sm: { left: '0' },
                    md: { fontSize: '6rem', left: '-0.125rem' },
                  })}
                  style={{
                    backgroundImage:
                      'linear-gradient(160deg, rgba(167,139,250,0.35) 0%, rgba(139,92,246,0.18) 50%, rgba(255,255,255,0.06) 100%)',
                    WebkitBackgroundClip: 'text',
                  }}
                  aria-hidden="true"
                >
                  {"\u201C"}
                </span>
                <p className={css({ fontSize: { base: 'xl', sm: '2xl', md: '3xl' }, color: '#CDCDD6', lineHeight: { base: '1.7', sm: '1.65', md: '1.6' }, letterSpacing: '0.01em' })}>
                  {quote}
                </p>
              </blockquote>

              <h2
                className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED', mt: { base: '5', md: '6' } })}
                style={{ animation: 'fade-in-up 0.6s ease-out 0.5s both' }}
              >
                {personality.name}
              </h2>

              <p
                className={css({ color: '#9B9BA6', fontSize: '0.9375rem', mt: '2' })}
                style={{ animation: 'fade-in-up 0.6s ease-out 0.6s both' }}
              >
                {personality.role}
                <span className={css({ mx: '2', color: '#3A3A45' })}>&middot;</span>
                {personality.org}
              </p>

              {/* ── CTA row: pill button + podcast count ── */}
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4',
                  mt: { base: '6', md: '8' },
                  justifyContent: { base: 'center', md: 'flex-start' },
                  flexWrap: 'wrap',
                })}
                style={{ animation: 'fade-in-up 0.6s ease-out 0.7s both' }}
              >
                {/* Pill-shaped CTA button */}
                <span
                  className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '5',
                    py: '2.5',
                    rounded: 'full',
                    fontSize: 'sm',
                    fontWeight: '600',
                    color: '#E8E8ED',
                    bg: 'rgba(167, 139, 250, 0.08)',
                    borderWidth: '1px',
                    borderColor: 'rgba(167, 139, 250, 0.18)',
                    transition: 'all',
                    transitionDuration: '300ms',
                    _groupHover: {
                      bg: 'rgba(167, 139, 250, 0.14)',
                      borderColor: 'rgba(167, 139, 250, 0.3)',
                      color: '#FFFFFF',
                      boxShadow: '0 0 16px rgba(167, 139, 250, 0.1)',
                    },
                  })}
                >
                  Read their story
                  <span className={css({ display: 'inline-block', transition: 'transform', transitionDuration: '300ms', _groupHover: { transform: 'translateX(3px)' } })}>
                    &rarr;
                  </span>
                </span>

                {/* Podcast count indicator */}
                {podcastCount > 0 && (
                  <span
                    className={css({
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '1.5',
                      fontSize: 'xs',
                      fontWeight: '500',
                      color: '#7B7B86',
                      letterSpacing: '0.02em',
                    })}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={css({ flexShrink: 0 })}
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    {podcastCount} podcast{podcastCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
