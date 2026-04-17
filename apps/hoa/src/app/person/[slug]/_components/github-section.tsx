import type { EnrichedData } from "@/lib/enrichment";
import { formatNumber } from "@/lib/enrichment";
import { ExternalLinkIcon } from "./icons";
import { css, cx } from "styled-system/css";

type Props = {
  github: EnrichedData["github"];
};

export function GitHubSection({ github }: Props) {
  if (!github || github.repos.length === 0) return null;

  return (
    <div className={css({ mt: '10' })}>
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '4' })}>
        GitHub
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '3' })}>
        <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86', flexShrink: 0 })} fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
        </svg>
        <span className={css({ fontSize: 'sm', fontWeight: 'bold', color: '#E8E8ED' })}>Open Source</span>
        <span className={css({ fontSize: 'xs', color: '#5A5A66' })}>
          {github.repos.length} repos · {formatNumber(github.totalStars)} stars
        </span>
      </div>

      <div className={css({ display: 'grid', gap: '2', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
        {github.repos.slice(0, 8).map((repo, i) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", "animate-row-enter", css({ display: 'block', px: '4', py: '3', rounded: 'lg', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.1)' } }))}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '0.5' })}>
              <span className={css({ fontSize: '13px', fontWeight: 'semibold', color: '#C4C4CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#E8E8ED' } })}>
                {repo.name}
              </span>
              <ExternalLinkIcon className={css({ w: '2.5', h: '2.5', color: '#7B7B86', flexShrink: 0, opacity: 0, transition: 'opacity', transitionDuration: '200ms', _groupHover: { opacity: 1 } })} />
            </div>
            {repo.description && (
              <p className={css({ fontSize: '11px', color: '#5A5A66', lineHeight: '1.4', lineClamp: 1, mb: '1.5' })}>
                {repo.description}
              </p>
            )}
            <div className={css({ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3' })}>
              {repo.language && (
                <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1', fontSize: '11px', color: '#7B7B86' })}>
                  <span
                    className={css({ w: '2', h: '2', rounded: 'full', flexShrink: 0 })}
                    style={{
                      backgroundColor:
                        github.languages.find((l) => l.name === repo.language)?.color ||
                        "#8b8b8b",
                    }}
                  />
                  {repo.language}
                </span>
              )}
              {repo.stars > 0 && (
                <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '0.5', fontSize: '11px', color: '#7B7B86' })}>
                  <svg viewBox="0 0 16 16" className={css({ w: '2.5', h: '2.5' })} fill="currentColor">
                    <polygon points="8 1.25 10.18 5.67 15 6.36 11.5 9.78 12.36 14.58 8 12.27 3.64 14.58 4.5 9.78 1 6.36 5.82 5.67 8 1.25" />
                  </svg>
                  {formatNumber(repo.stars)}
                </span>
              )}
              {repo.forks > 0 && (
                <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '0.5', fontSize: '11px', color: '#7B7B86' })}>
                  <svg viewBox="0 0 16 16" className={css({ w: '2.5', h: '2.5' })} fill="currentColor">
                    <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-.25 2.51a2.25 2.25 0 1 0-1.5 0v1.29a.75.75 0 0 0 .22.53l2.25 2.25a.25.25 0 0 1 .073.177v1.232a2.251 2.251 0 1 0 1.5 0V10.01a1.75 1.75 0 0 0-.513-1.237L4.75 6.56V5.76zm7.5.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-.25 2.51a2.25 2.25 0 1 0-1.5 0v1.29a.75.75 0 0 0 .22.53l2.25 2.25a.25.25 0 0 1 .073.177v.232a2.251 2.251 0 1 0 1.5 0v-.482a1.75 1.75 0 0 0-.513-1.237L10.75 9.06V8.51z" />
                  </svg>
                  {repo.forks}
                </span>
              )}
              {repo.topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className={css({ px: '2', py: '0.5', rounded: 'md', bg: 'rgba(255,255,255,0.04)', fontSize: '10px', color: '#5A5A66' })}
                >
                  {topic}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
