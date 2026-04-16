import { css, cx } from "styled-system/css";
import type { PersonResearch } from "@/lib/personalities/types";

export function ResearchBio({ research }: { research: PersonResearch }) {
  if (!research.bio && research.topics.length === 0) return null;

  return (
    <div className={css({ mt: '14', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', pt: { base: '8', md: '10' } })}>
      <p className={cx("section-label", css({ mb: '6' }))}>Biography</p>

      {research.bio && (
        <div
          className={css({ pl: { base: '6', md: '8' }, py: '2' })}
          style={{ borderLeft: "2px solid rgba(139,92,246,0.3)" }}
        >
          <p className={css({ color: '#8B8B96', fontSize: '0.9375rem', lineHeight: '1.85' })}>
            {research.bio}
          </p>
        </div>
      )}

      {research.topics.length > 0 && (
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2.5', mt: '6' })}>
          {research.topics.map((topic) => (
            <span
              key={topic}
              className={css({ px: '4', py: '2', rounded: 'full', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', fontSize: 'xs', color: '#8B8B96' })}
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
