import { css, cx } from "styled-system/css";
import type { Paper } from "@/lib/personalities/types";
import { ExternalLinkIcon } from "./icons";

type Props = {
  papers: Paper[];
};

export function PapersSection({ papers }: Props) {
  if (papers.length === 0) return null;

  return (
    <div className={css({ mt: '14' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg
            viewBox="0 0 24 24"
            className={css({ w: '5', h: '5', color: '#7B7B86' })}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Research Papers</h2>
        <span className={css({ fontSize: 'sm', color: '#7B7B86' })}>
          {papers.length} {papers.length === 1 ? "paper" : "papers"}
        </span>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '5' })}>
        {papers.map((paper, i) => {
          const isArxiv = !!paper.arxiv;
          const hasDoi = !!paper.doi;
          const href = isArxiv
            ? `https://arxiv.org/abs/${paper.arxiv}`
            : hasDoi
              ? `https://doi.org/${paper.doi}`
              : paper.url ?? "#";
          const badge = isArxiv ? "arXiv" : hasDoi ? "DOI" : "Link";
          const id = isArxiv ? paper.arxiv : hasDoi ? paper.doi : new URL(paper.url ?? "https://example.com").hostname.replace(/^www\./, "");

          return (
            <a
              key={paper.arxiv ?? paper.doi ?? paper.url ?? paper.title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                css({ display: 'block', px: { base: '6', md: '7' }, py: '6', rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', _hover: { borderColor: 'rgba(255,255,255,0.1)' }, transition: 'all', transitionDuration: '200ms' }),
                "group animate-row-enter"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '4' })}>
                <div className={css({ flexShrink: 0, mt: '0.5', px: '2.5', py: '1', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: '11px', fontFamily: 'mono', fontWeight: 'semibold', color: '#8B8B96', letterSpacing: 'wide' })}>
                  {badge}
                </div>
                <div className={css({ minW: '0', flex: '1' })}>
                  <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: '#C4C4CC', _groupHover: { color: '#E8E8ED' }, transition: 'colors', transitionDuration: '200ms', lineHeight: '1.6' })}>
                    {paper.title}
                  </span>
                  <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { base: '3', md: '4' }, mt: '3', fontSize: 'xs', color: '#7B7B86' })}>
                    <span className={css({ fontFamily: 'mono' })}>{id}</span>
                    <span>&middot;</span>
                    <span>{paper.date}</span>
                  </div>
                </div>
                <ExternalLinkIcon className={css({ w: '4', h: '4', color: '#7B7B86', _groupHover: { color: '#C4C4CC' }, flexShrink: 0, mt: '1', transition: 'colors', transitionDuration: '200ms' })} />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
