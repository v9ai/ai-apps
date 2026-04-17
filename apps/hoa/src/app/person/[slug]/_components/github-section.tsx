import type { EnrichedData } from "@/lib/enrichment";
import { formatNumber } from "@/lib/enrichment";
import { css, cx } from "styled-system/css";

type Props = {
  github: EnrichedData["github"];
};

export function GitHubSection({ github }: Props) {
  if (!github || github.repos.length === 0) return null;

  return (
    <div className={css({ mt: '10' })}>
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '3' })}>
        GitHub · {github.repos.length} repos · {formatNumber(github.totalStars)} stars
      </p>

      <div className={css({ display: 'grid', gap: '1.5', sm: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
        {github.repos.slice(0, 8).map((repo, i) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cx("group", "animate-row-enter", css({ display: 'flex', alignItems: 'baseline', gap: '2', px: '3', py: '2', rounded: 'md', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.05)', transition: 'all', transitionDuration: '150ms', _hover: { borderColor: 'rgba(255,255,255,0.12)', bg: '#1a1a1f' } }))}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className={css({ fontSize: '12px', fontWeight: '600', color: '#C4C4CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minW: 0, _groupHover: { color: '#E8E8ED' } })}>
              {repo.name}
            </span>
            {repo.language && (
              <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1', fontSize: '10px', color: '#5A5A66', flexShrink: 0 })}>
                <span
                  className={css({ w: '1.5', h: '1.5', rounded: 'full' })}
                  style={{ backgroundColor: github.languages.find((l) => l.name === repo.language)?.color || "#8b8b8b" }}
                />
                {repo.language}
              </span>
            )}
            <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '0.5', fontSize: '10px', color: '#5A5A66', flexShrink: 0, ml: 'auto' })}>
              <svg viewBox="0 0 16 16" className={css({ w: '2.5', h: '2.5' })} fill="currentColor">
                <polygon points="8 1.25 10.18 5.67 15 6.36 11.5 9.78 12.36 14.58 8 12.27 3.64 14.58 4.5 9.78 1 6.36 5.82 5.67 8 1.25" />
              </svg>
              {formatNumber(repo.stars)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
