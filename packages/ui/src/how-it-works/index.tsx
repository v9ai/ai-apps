import type { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface Paper {
  slug: string;
  number: number;
  title: string;
  category: string;
  wordCount: number;
  readingTimeMin: number;
  authors?: string;
  year?: number;
  venue?: string;
  finding?: string;
  relevance?: string;
  url?: string;
  categoryColor?: string;
}

interface PipelineAgent {
  name: string;
  icon?: ReactNode;
  color?: string;
  description: string;
  researchBasis?: string;
  paperIndices?: number[];
}

interface Stat {
  number: string;
  label: string;
  source?: string;
  paperIndex?: number;
}

interface HowItWorksProps {
  papers: Paper[];
  title?: string;
  onPaperClick?: (paper: Paper) => void;
  agents?: PipelineAgent[];
  stats?: Stat[];
  subtitle?: string;
  story?: string;
  children?: ReactNode;
}

export type { Paper, PipelineAgent, Stat, HowItWorksProps };

// ─── Prose column wrapper ──────────────────────────────────────────

const prose: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "0 1rem",
  paddingBottom: "3rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

// ─── Main Component ────────────────────────────────────────────────

export function HowItWorks({
  papers,
  title = "How It Works",
  agents,
  stats,
  subtitle,
  story,
  children,
}: HowItWorksProps) {
  const sorted = [...papers].sort((a, b) => a.number - b.number);

  return (
    <div style={prose}>
      {/* Header */}
      {title && (
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "2rem 0 0" }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0.5rem 0 0" }}>
          {subtitle}
        </p>
      )}

      {/* Story */}
      {story && (
        <p style={{ margin: "1.5rem 0 0" }}>{story}</p>
      )}

      {/* Stats — single paragraph */}
      {stats && stats.length > 0 && (
        <p style={{ margin: "1.5rem 0 0" }}>
          <strong>Key findings: </strong>
          {stats
            .map((s) => `${s.number} ${s.label}${s.source ? ` (${s.source})` : ""}`)
            .join("; ")}
          .
        </p>
      )}

      {/* Papers — ordered list */}
      {sorted.length > 0 && (
        <>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>
            Research Papers
          </h3>
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {sorted.map((paper) => (
              <li key={paper.slug} style={{ marginBottom: "1rem" }}>
                <em>{paper.title}</em>
                {paper.authors && <> — {paper.authors}</>}
                {paper.year && <> ({paper.year})</>}
                {paper.venue && <>, {paper.venue}</>}
                {paper.finding && (
                  <>
                    . <strong>Finding:</strong> {paper.finding}
                  </>
                )}
                {paper.relevance && (
                  <>
                    {" "}
                    <strong>Relevance:</strong> {paper.relevance}
                  </>
                )}
                {paper.url && (
                  <>
                    {" "}
                    <a href={paper.url} target="_blank" rel="noopener noreferrer">
                      [link]
                    </a>
                  </>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Agents — ordered list */}
      {agents && agents.length > 0 && (
        <>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>
            Agent Pipeline
          </h3>
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {agents.map((agent) => (
              <li key={agent.name} style={{ marginBottom: "1.25rem" }}>
                <strong>{agent.name}</strong> — {agent.description}
                {agent.researchBasis && (
                  <>
                    {" "}
                    <em>Research basis: {agent.researchBasis}.</em>
                  </>
                )}
                {agent.paperIndices && agent.paperIndices.length > 0 && (
                  <>
                    {" "}
                    Related papers:{" "}
                    {agent.paperIndices
                      .map((pi) => papers[pi]?.title)
                      .filter(Boolean)
                      .join("; ")}
                    .
                  </>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Children passthrough */}
      {children}
    </div>
  );
}
