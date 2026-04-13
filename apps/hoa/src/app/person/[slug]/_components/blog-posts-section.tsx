import { css, cx } from "styled-system/css";
import type { BlogPost } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

type Props = {
  posts: BlogPost[];
  blogUrl?: string;
};

export function BlogPostsSection({ posts, blogUrl }: Props) {
  if (posts.length === 0) return null;

  return (
    <div className={cx(css({ mt: '16' }), "animate-fade-in-up")} style={{ animationDelay: "0.1s" }}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Blog
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5' })}>
          <div className={css({ w: '10', h: '10', rounded: 'full', bg: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', shadow: 'sm' })}>
            <svg
              viewBox="0 0 24 24"
              className={css({ w: '5', h: '5', color: 'white' })}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5' })}>
            <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Blog Posts</h2>
            <span className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', px: '2.5', py: '1', rounded: 'full', fontSize: '11px', fontWeight: 'semibold', bg: 'rgba(255,255,255,0.07)', color: '#7B7B86', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontVariantNumeric: 'tabular-nums', lineHeight: '1' })}>
              {posts.length}
            </span>
          </div>
        </div>

        {blogUrl && (
          <a
            href={blogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", css({ display: 'inline-flex', alignItems: 'center', gap: '2', px: '4', py: '2', rounded: 'lg', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', transition: 'all', transitionDuration: '200ms', fontSize: 'xs', color: '#8B8B96', _hover: { bg: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: '#E8E8ED' } }))}
          >
            <span>View all</span>
            <ExternalLinkIcon className={css({ w: '3', h: '3' })} />
          </a>
        )}
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
        {posts.map((post, i) => (
          <a
            key={`${post.url}-${i}`}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              "group animate-fade-in-up",
              css({
                display: 'flex',
                flexDir: { base: 'column', sm: 'row' },
                alignItems: { sm: 'flex-start' },
                gap: { base: '2', sm: '4' },
                px: '5',
                py: '4',
                rounded: 'xl',
                bg: '#141418',
                borderWidth: '1px',
                borderColor: 'rgba(255,255,255,0.06)',
                transition: 'all',
                transitionDuration: '200ms',
                _hover: { borderColor: 'rgba(99,102,241,0.3)', bg: '#1C1C22' },
                opacity: 0,
              })
            )}
            style={{ animationDelay: `${0.15 + i * 0.04}s`, animationFillMode: "both" }}
          >
            {/* Date */}
            <span className={css({ fontSize: 'xs', color: '#7B7B86', flexShrink: 0, minW: '90px', fontVariantNumeric: 'tabular-nums', pt: '0.5' })}>
              {post.date}
            </span>

            {/* Content */}
            <div className={css({ flex: 1, minW: 0 })}>
              <div className={css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3' })}>
                <h3 className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#E8E8ED', lineHeight: 'snug', _groupHover: { color: '#A5B4FC' }, transition: 'colors', transitionDuration: '200ms' })}>
                  {post.title}
                </h3>
                <ExternalLinkIcon className={css({ w: '3.5', h: '3.5', color: '#7B7B86', flexShrink: 0, opacity: 0, _groupHover: { opacity: 1 }, transition: 'opacity', transitionDuration: '200ms', mt: '0.5' })} />
              </div>
              {post.summary && (
                <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '1.5', lineHeight: 'relaxed', lineClamp: 2 })}>
                  {post.summary}
                </p>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1.5', mt: '2' })}>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className={css({ px: '2', py: '0.5', rounded: 'md', bg: 'rgba(99,102,241,0.1)', color: '#818CF8', fontSize: '10px', fontWeight: 'medium', letterSpacing: '0.02em' })}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
