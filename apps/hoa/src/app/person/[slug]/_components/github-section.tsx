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
    <div className={css({ mt: '14' })}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        GitHub
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86' })} fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
        </div>
        <div>
          <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Open Source Projects</h2>
          <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '1' })}>
            {github.repos.length} repositories · {formatNumber(github.totalStars)} total stars
          </p>
        </div>
      </div>

      <div className={css({ display: 'grid', gap: '5', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
        {github.repos.slice(0, 8).map((repo, i) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", "animate-row-enter", css({ display: 'block', px: '6', py: '6', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', transition: 'all', transitionDuration: '200ms', _hover: { borderColor: 'rgba(255,255,255,0.1)' } }))}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3' })}>
              <div className={css({ minW: '0', flex: '1' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                  <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: '#C4C4CC', transition: 'colors', transitionDuration: '200ms', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', _groupHover: { color: '#E8E8ED' } })}>
                    {repo.name}
                  </span>
                  <ExternalLinkIcon className={css({ w: '3', h: '3', color: '#7B7B86', flexShrink: 0, transition: 'colors', transitionDuration: '200ms', _groupHover: { color: '#C4C4CC' } })} />
                </div>
                {repo.description && (
                  <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '2.5', lineHeight: 'relaxed', lineClamp: 2 })}>
                    {repo.description}
                  </p>
                )}
                <div className={css({ display: 'flex', alignItems: 'center', gap: '5', mt: '4' })}>
                  {repo.language && (
                    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5', fontSize: '11px', color: '#7B7B86' })}>
                      <span
                        className={css({ w: '2.5', h: '2.5', rounded: 'full', flexShrink: 0 })}
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
                    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1', fontSize: '11px', color: '#7B7B86' })}>
                      <svg viewBox="0 0 16 16" className={css({ w: '3', h: '3' })} fill="currentColor">
                        <polygon points="8 1.25 10.18 5.67 15 6.36 11.5 9.78 12.36 14.58 8 12.27 3.64 14.58 4.5 9.78 1 6.36 5.82 5.67 8 1.25" />
                      </svg>
                      {formatNumber(repo.stars)}
                    </span>
                  )}
                  {repo.forks > 0 && (
                    <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1', fontSize: '11px', color: '#7B7B86' })}>
                      <svg viewBox="0 0 16 16" className={css({ w: '3', h: '3' })} fill="currentColor">
                        <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-.25 2.51a2.25 2.25 0 1 0-1.5 0v1.29a.75.75 0 0 0 .22.53l2.25 2.25a.25.25 0 0 1 .073.177v1.232a2.251 2.251 0 1 0 1.5 0V10.01a1.75 1.75 0 0 0-.513-1.237L4.75 6.56V5.76zm7.5.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-.25 2.51a2.25 2.25 0 1 0-1.5 0v1.29a.75.75 0 0 0 .22.53l2.25 2.25a.25.25 0 0 1 .073.177v.232a2.251 2.251 0 1 0 1.5 0v-.482a1.75 1.75 0 0 0-.513-1.237L10.75 9.06V8.51z" />
                      </svg>
                      {repo.forks}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {repo.topics.length > 0 && (
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2.5', mt: '5' })}>
                {repo.topics.slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className={css({ px: '3', py: '1', rounded: 'full', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '11px', color: '#7B7B86' })}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
