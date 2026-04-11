import { css, cx } from "styled-system/css";
import type { Video } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

type Props = {
  videos: Video[];
};

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function VideosSection({ videos }: Props) {
  if (videos.length === 0) return null;

  return (
    <div className={cx(css({ mt: '16' }), "animate-fade-in-up")} style={{ animationDelay: "0.1s" }}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Videos
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5', mb: '8' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', shadow: 'sm' })}>
          <svg
            viewBox="0 0 16 16"
            className={css({ w: '5', h: '5', color: 'white', ml: '0.5' })}
            fill="currentColor"
          >
            <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
          </svg>
        </div>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5' })}>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Video Appearances</h2>
          <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: '2.5', py: '1', rounded: 'full', fontSize: '11px', fontWeight: 'semibold', bg: 'rgba(255,255,255,0.07)', color: '#7B7B86', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontVariantNumeric: 'tabular-nums', lineHeight: '1' })}>
            {videos.length}
          </span>
        </div>
      </div>

      <div className={css({ display: 'grid', gap: '4', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', sm: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } })}>
        {videos.map((video, i) => {
          const videoId = getYouTubeId(video.url);
          const thumbnail = videoId
            ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            : null;

          return (
            <a
              key={`${video.url}-${i}`}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "group animate-fade-in-up",
                css({
                  display: 'block',
                  rounded: 'xl',
                  bg: '#141418',
                  borderWidth: '1px',
                  borderColor: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  transition: 'all',
                  transitionDuration: '200ms',
                  _hover: { borderColor: 'rgba(255,0,0,0.3)', bg: '#1C1C22' },
                  opacity: 0,
                })
              )}
              style={{ animationDelay: `${0.15 + i * 0.06}s`, animationFillMode: "both" }}
            >
              {/* Thumbnail */}
              <div className={css({ pos: 'relative', aspectRatio: '16/9', bg: '#1C1C22', overflow: 'hidden' })}>
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={video.title}
                    className={css({ w: 'full', h: 'full', objectFit: 'cover', transition: 'transform', transitionDuration: '300ms', _groupHover: { transform: 'scale(1.03)' } })}
                  />
                ) : (
                  <div className={css({ w: 'full', h: 'full', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                    <svg viewBox="0 0 24 24" className={css({ w: '8', h: '8', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                )}

                {/* Play button overlay */}
                <div className={css({ pos: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bg: 'rgba(0,0,0,0.25)', opacity: 0, _groupHover: { opacity: 1 }, transition: 'opacity', transitionDuration: '200ms' })}>
                  <div className={css({ w: '12', h: '12', rounded: 'full', bg: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', shadow: 'lg' })}>
                    <svg viewBox="0 0 16 16" className={css({ w: '5', h: '5', color: 'white', ml: '0.5' })} fill="currentColor">
                      <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
                    </svg>
                  </div>
                </div>

                {/* Duration badge */}
                {video.duration && (
                  <span className={css({ pos: 'absolute', bottom: '2', right: '2', px: '2', py: '0.5', rounded: 'md', bg: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '11px', fontWeight: 'semibold', fontVariantNumeric: 'tabular-nums', lineHeight: '1.4' })}>
                    {video.duration}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className={css({ px: '3', py: '2.5' })}>
                <h3 className={css({ fontSize: 'xs', sm: { fontSize: 'sm' }, fontWeight: 'medium', color: '#E8E8ED', lineClamp: 2, mb: '1.5', lineHeight: 'snug' })}>
                  {video.title}
                </h3>
                <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2' })}>
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '2', minW: 0 })}>
                    {video.channel && (
                      <span className={css({ fontSize: 'xs', color: '#7B7B86', lineClamp: 1 })}>
                        {video.channel}
                      </span>
                    )}
                    {video.channel && video.date && (
                      <span className={css({ color: '#5A5A65', fontSize: 'xs' })}>·</span>
                    )}
                    {video.date && (
                      <span className={css({ fontSize: 'xs', color: '#7B7B86', flexShrink: 0 })}>
                        {video.date}
                      </span>
                    )}
                  </div>
                  <ExternalLinkIcon className={css({ w: '3', h: '3', color: '#7B7B86', flexShrink: 0, opacity: 0, _groupHover: { opacity: 1 }, transition: 'opacity', transitionDuration: '200ms' })} />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
