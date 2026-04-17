import { css, cx } from "styled-system/css";
import { formatDistanceToNow } from "date-fns";
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
  vision_retrieval: "#0EA5E9",
  graph_rag: "#22D3EE",
  gpu_optimization: "#F97316",
  observability: "#84CC16",
  responsible_ai: "#D946EF",
  full_stack_ai: "#14B8A6",
  model_training: "#6366F1",
  building_in_public: "#F43F5E",
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
  vision_retrieval: "Vision-Language Retrieval",
  graph_rag: "Graph RAG",
  gpu_optimization: "GPU Optimization",
  observability: "Observability & Monitoring",
  responsible_ai: "Responsible AI",
  full_stack_ai: "Full-Stack AI",
  model_training: "Model Training & Benchmarks",
  building_in_public: "Building in Public",
};

function renderInline(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function ResearchQuestions({ research, debug = false }: { research: PersonResearch; debug?: boolean }) {
  if (!research.questions?.length) return null;

  const grouped = new Map<string, typeof research.questions>();
  for (const q of research.questions) {
    const list = grouped.get(q.category) ?? [];
    list.push(q);
    grouped.set(q.category, list);
  }

  return (
    <div>
      <div className={css({ display: 'flex', flexDir: 'column', gap: { base: '8', md: '10' } })}>
        {Array.from(grouped.entries()).map(([category, questions], gi) => (
          <div key={category}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5', mb: '4' })}>
              <span
                className={css({ w: '2.5', h: '2.5', rounded: 'full', flexShrink: '0' })}
                style={{ backgroundColor: CATEGORY_COLORS[category] ?? '#7B7B86' }}
              />
              <h3 className={css({ fontSize: 'md', fontWeight: '600', color: '#D8D8E0', letterSpacing: '0.02em' })}>
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
                  <p className={css({ fontSize: 'md', color: '#F0F0F5', lineHeight: '1.85' })}>
                    {renderInline(q.question)}
                  </p>
                  {q.last_verified && (
                    <p className={css({ mt: '2.5', fontSize: 'xs', color: '#5A5A66' })}>
                      Verified {formatDistanceToNow(new Date(q.last_verified))} ago
                    </p>
                  )}
                  {debug && q.why_this_question && (
                    <p className={css({ mt: '3', fontSize: 'sm', color: '#9B9BA8', lineHeight: '1.75' })}>
                      <span className={css({ fontWeight: '600', color: '#B0B0BC' })}>Why this question: </span>
                      {renderInline(q.why_this_question)}
                    </p>
                  )}
                  {debug && q.expected_insight && (
                    <p className={css({ mt: '1.5', fontSize: 'sm', color: '#9B9BA8', lineHeight: '1.75' })}>
                      <span className={css({ fontWeight: '600', color: '#B0B0BC' })}>Expected insight: </span>
                      {renderInline(q.expected_insight)}
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
