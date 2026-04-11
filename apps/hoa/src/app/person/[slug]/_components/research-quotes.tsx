import { css, cx } from "styled-system/css";
import type { PersonResearch } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

export function ResearchQuotes({ research }: { research: PersonResearch }) {
  if (!research.quotes.length) return null;
  return (
    <div className={css({ mt: '14', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', pt: { base: '8', md: '10' } })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', flexShrink: '0' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </div>
        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Notable Quotes</h2>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: { base: '5', md: '6' } })}>
        {research.quotes.map((q, i) => (
          <div
            key={i}
            className={cx(
              css({ px: { base: '6', md: '8' }, py: { base: '6', md: '8' }, rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', pos: 'relative' }),
              "animate-row-enter"
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className={css({ pos: 'absolute', top: '2', left: { base: '3', md: '4' }, fontSize: '5xl', color: 'rgba(255,255,255,0.07)', lineHeight: '1', userSelect: 'none' })}>&ldquo;</span>
            <p className={css({ fontSize: 'sm', color: '#C4C4CC', lineHeight: '1.85', pl: { base: '7', md: '8' }, pt: '1' })}>
              {q.text}
            </p>
            <div className={css({ mt: '5', display: 'flex', alignItems: 'center', gap: '2.5', fontSize: 'xs', color: '#7B7B86', pl: { base: '7', md: '8' } })}>
              <span>{q.source}</span>
              {q.url && (
                <>
                  <span>&middot;</span>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({ _hover: { color: '#C4C4CC' }, transition: 'colors', transitionDuration: '200ms', display: 'inline-flex', alignItems: 'center', gap: '1.5' })}
                  >
                    Source <ExternalLinkIcon className={css({ w: '3', h: '3' })} />
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
