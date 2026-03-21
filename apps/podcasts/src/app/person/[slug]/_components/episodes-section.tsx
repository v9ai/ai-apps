import { css, cx } from "styled-system/css";
import type { Episode } from "@/lib/episodes";

type Props = {
  episodes: Episode[];
};

export function EpisodesSection({ episodes }: Props) {
  if (episodes.length === 0) return null;

  return (
    <div className={cx(css({ mt: '16' }), "animate-fade-in-up")} style={{ animationDelay: "0.1s" }}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Episodes
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5', mb: '8' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', shadow: 'sm' })}>
          <svg
            viewBox="0 0 16 16"
            className={css({ w: '5', h: '5', color: 'black', ml: '0.5' })}
            fill="currentColor"
          >
            <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
          </svg>
        </div>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5' })}>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Podcast Appearances</h2>
          {/* Episode count badge */}
          <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: '2.5', py: '1', rounded: 'full', fontSize: '11px', fontWeight: 'semibold', bg: 'rgba(255,255,255,0.07)', color: '#7B7B86', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontVariantNumeric: 'tabular-nums', lineHeight: '1' })}>
            {episodes.length}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', px: '4', py: '3', mb: '3', fontSize: '11px', textTransform: 'uppercase', letterSpacing: 'wider', color: '#7B7B86', fontWeight: 'medium' })}>
        <div className={css({ w: '6', flexShrink: 0 })}>#</div>
        <div className={css({ w: '10', flexShrink: 0 })} />
        <div className={css({ flex: '1' })}>Title</div>
        <div className={css({ flexShrink: 0, display: 'none', w: '24', sm: { display: 'block' } })}>Date</div>
        <div className={css({ flexShrink: 0, w: '12', textAlign: 'right' })}>Dur.</div>
      </div>
      <div className={css({ h: '1px', bg: 'rgba(255,255,255,0.06)', mb: '3' })} />

      <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
        {episodes.map((ep, i) => (
          <a
            key={ep.spotify_id}
            href={ep.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              css({
                display: 'flex', alignItems: 'center', gap: '4', px: '4', py: '4', rounded: 'lg',
                borderTopWidth: '1px', borderLeftWidth: '2px', borderColor: 'rgba(255,255,255,0.04)',
                _hover: { borderColor: '#1DB954', bg: '#1C1C22' },
                transition: 'all', transitionDuration: '200ms', cursor: 'pointer',
                opacity: 0,
              }),
              "group animate-fade-in-up"
            )}
            style={{ animationDelay: `${0.15 + i * 0.06}s`, animationFillMode: "both" }}
          >
            {/* Track number / play icon */}
            <div className={css({ w: '6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
              <span className={css({ fontSize: 'sm', color: '#7B7B86', fontVariantNumeric: 'tabular-nums', _groupHover: { display: 'none' } })}>
                {i + 1}
              </span>
              <svg
                viewBox="0 0 16 16"
                className={css({ w: '4', h: '4', color: '#E8E8ED', display: 'none', _groupHover: { display: 'block' } })}
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
                className={css({ w: '10', h: '10', rounded: 'md', objectFit: 'cover', flexShrink: 0 })}
              />
            ) : (
              <div className={css({ w: '10', h: '10', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, _groupHover: { bg: 'rgba(255,255,255,0.08)' }, transition: 'colors', transitionDuration: '200ms' })}>
                <svg
                  viewBox="0 0 24 24"
                  className={css({ w: '4', h: '4', color: '#7B7B86', _groupHover: { color: '#1DB954' }, transition: 'colors', transitionDuration: '200ms' })}
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
            <div className={css({ minW: '0', flex: '1' })}>
              <span className={css({ display: 'block', fontSize: '0.9375rem', fontWeight: 'medium', color: '#E8E8ED', lineClamp: 1, mb: '1.5' })}>
                {ep.name}
              </span>
              <span className={css({ fontSize: 'xs', color: '#7B7B86', lineClamp: 1 })}>
                {ep.show_name}
              </span>
            </div>

            {/* Date */}
            <span className={css({ fontSize: 'xs', color: '#7B7B86', flexShrink: 0, display: 'none', sm: { display: 'block' } })}>
              {ep.release_date}
            </span>

            {/* Duration */}
            <span className={css({ fontSize: 'xs', color: '#7B7B86', fontVariantNumeric: 'tabular-nums', flexShrink: 0, w: '12', textAlign: 'right' })}>
              {ep.duration_min} min
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
