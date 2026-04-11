import { css } from "styled-system/css";
import type { PersonResearch } from "@/lib/personalities/types";

export function ResearchSources({ research }: { research: PersonResearch }) {
  if (!research.sources.length) return null;
  return (
    <div className={css({ mt: '14', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.05)', pt: { base: '6', md: '8' } })}>
      <details>
        <summary className={css({ display: 'flex', alignItems: 'center', gap: '3', cursor: 'pointer', fontSize: 'sm', color: '#7B7B86', _hover: { color: '#E8E8ED' }, transition: 'colors', transitionDuration: '200ms', py: '1' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '4', h: '4', flexShrink: '0' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {research.sources.length} sources
          <span className={css({ color: '#7B7B86', fontSize: 'xs' })}>(click to expand)</span>
        </summary>
        <div className={css({ mt: { base: '4', md: '5' }, display: 'flex', flexDir: 'column', gap: { base: '3', md: '4' }, pl: { base: '7', md: '7.5' } })}>
          {research.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={css({ display: 'block', fontSize: 'xs', color: '#7B7B86', _hover: { color: '#C4C4CC' }, transition: 'colors', transitionDuration: '200ms', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', py: '1' })}
            >
              {s.title || s.url}
            </a>
          ))}
        </div>
      </details>
      <p className={css({ mt: { base: '6', md: '8' }, fontSize: '11px', color: '#7B7B86' })}>
        Research generated {new Date(research.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}
