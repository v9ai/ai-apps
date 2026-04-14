import { css, cx } from "styled-system/css";
import type { PersonResearch } from "@/lib/personalities/types";

const CATEGORY_COLORS: Record<string, string> = {
  origin: "#E8A838",
  technical_depth: "#38BDF8",
  philosophy: "#A78BFA",
  collaboration: "#34D399",
  future: "#F472B6",
  architecture: "#F59E0B",
  ios_engineering: "#06B6D4",
  swift_runtime: "#FB923C",
  debugging: "#EF4444",
  build_systems: "#8B5CF6",
  apple_platform: "#64748B",
  ai_tools: "#10B981",
  social_media: "#EC4899",
};

const CATEGORY_LABELS: Record<string, string> = {
  origin: "Origin & Turning Points",
  technical_depth: "Technical Depth",
  philosophy: "Philosophy & Beliefs",
  collaboration: "Collaboration & Community",
  future: "Future & Predictions",
  architecture: "Architecture & Design",
  ios_engineering: "iOS Engineering",
  swift_runtime: "Swift Runtime",
  debugging: "Debugging",
  build_systems: "Build Systems",
  apple_platform: "Apple Platform",
  ai_tools: "AI Tools",
  social_media: "Social Media & Writing",
};

export function ResearchQuestions({ research }: { research: PersonResearch }) {
  if (!research.questions?.length) return null;

  const grouped = new Map<string, typeof research.questions>();
  for (const q of research.questions) {
    const list = grouped.get(q.category) ?? [];
    list.push(q);
    grouped.set(q.category, list);
  }

  return (
    <div className={css({ mt: '14', borderTopWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', pt: { base: '8', md: '10' } })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5', mb: '6' })}>
        <div className={css({ w: '10', h: '10', rounded: 'full', bg: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', flexShrink: '0' })}>
          <svg viewBox="0 0 24 24" className={css({ w: '5', h: '5', color: '#7B7B86' })} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: '#E8E8ED' })}>Interview Questions</h2>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: { base: '8', md: '10' } })}>
        {Array.from(grouped.entries()).map(([category, questions], gi) => (
          <div key={category}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5', mb: '4' })}>
              <span
                className={css({ w: '2.5', h: '2.5', rounded: 'full', flexShrink: '0' })}
                style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#7B7B86' }}
              />
              <h3 className={css({ fontSize: 'sm', fontWeight: '600', color: '#C4C4CC', letterSpacing: '0.02em' })}>
                {CATEGORY_LABELS[category] ?? category}
              </h3>
            </div>

            <div className={css({ display: 'flex', flexDir: 'column', gap: { base: '4', md: '5' } })}>
              {questions.map((q, i) => (
                <div
                  key={i}
                  className={cx(
                    css({ px: { base: '5', md: '7' }, py: { base: '5', md: '6' }, rounded: 'xl', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)', pos: 'relative' }),
                    "animate-row-enter"
                  )}
                  style={{ animationDelay: `${(gi * 2 + i) * 80}ms` }}
                >
                  <div
                    className={css({ pos: 'absolute', top: '0', left: '0', w: '1', h: 'full', roundedLeft: 'xl' })}
                    style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#7B7B86', opacity: 0.5 }}
                  />
                  <p className={css({ fontSize: 'sm', color: '#E8E8ED', lineHeight: '1.85' })}>
                    {q.question}
                  </p>
                  {q.why_this_question && (
                    <p className={css({ mt: '3', fontSize: 'xs', color: '#7B7B86', lineHeight: '1.7' })}>
                      <span className={css({ fontWeight: '600', color: '#9B9BA4' })}>Why this question: </span>
                      {q.why_this_question}
                    </p>
                  )}
                  {q.expected_insight && (
                    <p className={css({ mt: '1.5', fontSize: 'xs', color: '#7B7B86', lineHeight: '1.7' })}>
                      <span className={css({ fontWeight: '600', color: '#9B9BA4' })}>Expected insight: </span>
                      {q.expected_insight}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
