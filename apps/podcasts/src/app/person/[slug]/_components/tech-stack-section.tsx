import { css } from "styled-system/css";
import type { EnrichedData } from "@/lib/enrichment";

type Props = {
  languages: NonNullable<EnrichedData["github"]>["languages"];
};

export function TechStackSection({ languages }: Props) {
  if (!languages || languages.length === 0) return null;

  const total = languages.reduce((s, l) => s + l.count, 0);

  return (
    <div className={css({ mt: '14' })}>
      {/* Section label */}
      <p className={css({ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5A5A65', mb: '6' })}>
        Languages
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '4', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' })}>
          <svg
            viewBox="0 0 24 24"
            className={css({ w: '4', h: '4', color: '#7B7B86' })}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Tech Stack</h2>
      </div>

      {/* Language bar */}
      <div className={css({ h: '3', rounded: 'full', overflow: 'hidden', display: 'flex', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', px: '4', py: '6' })}>
        {languages.map((lang) => {
          const pct = (lang.count / total) * 100;
          return (
            <div
              key={lang.name}
              className={css({ h: 'full', _first: { borderTopLeftRadius: '9999px', borderBottomLeftRadius: '9999px' }, _last: { borderTopRightRadius: '9999px', borderBottomRightRadius: '9999px' }, transition: 'all', transitionDuration: '500ms' })}
              style={{ width: `${pct}%`, backgroundColor: lang.color }}
              title={`${lang.name}: ${pct.toFixed(0)}%`}
            />
          );
        })}
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', columnGap: '8', rowGap: '4', mt: '8' })}>
        {languages.slice(0, 8).map((lang) => {
          const pct = (lang.count / total) * 100;
          return (
            <span key={lang.name} className={css({ display: 'inline-flex', alignItems: 'center', gap: '2.5', fontSize: 'xs', color: '#8B8B96' })}>
              <span
                className={css({ w: '3', h: '3', rounded: 'full', flexShrink: 0 })}
                style={{ backgroundColor: lang.color }}
              />
              <span>{lang.name}</span>
              <span className={css({ color: '#7B7B86', ml: '1' })}>{pct.toFixed(0)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
