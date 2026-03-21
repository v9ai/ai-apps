import { css, cx } from "styled-system/css";
import type { PersonResearch } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

export function ResearchContributions({ research }: { research: PersonResearch }) {
  if (!research.key_contributions.length) return null;
  return (
    <div className={css({ mt: '14' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Key Contributions</h2>
      </div>

      <div className={css({ display: 'grid', gap: '5', sm: { gap: '6', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } })}>
        {research.key_contributions.map((c, i) => (
          <a
            key={c.title}
            href={c.url || undefined}
            target={c.url ? "_blank" : undefined}
            rel={c.url ? "noopener noreferrer" : undefined}
            className={cx(
              css({
                display: 'block', px: '6', py: '6', rounded: 'xl', bg: '#141418',
                borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)',
                _hover: { borderColor: 'rgba(255,255,255,0.1)' },
                transition: 'all', transitionDuration: '200ms',
                ...(!c.url ? { cursor: 'default' } : {}),
              }),
              "group animate-row-enter"
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '3' })}>
              <div className={css({ minW: '0', flex: '1' })}>
                <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#C4C4CC', _groupHover: { color: '#E8E8ED' }, transition: 'colors', transitionDuration: '200ms' })}>
                  {c.title}
                </span>
                <p className={css({ fontSize: 'xs', color: '#7B7B86', mt: '2.5', lineHeight: 'relaxed' })}>
                  {c.description}
                </p>
              </div>
              {c.url && (
                <ExternalLinkIcon className={css({ w: '4', h: '4', color: '#7B7B86', _groupHover: { color: '#C4C4CC' }, flexShrink: 0, mt: '0.5', transition: 'colors', transitionDuration: '200ms' })} />
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
