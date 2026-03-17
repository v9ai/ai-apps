"use client";
import {
  papers,
  researchStats,
  pipelineAgents,
  story,
} from "@/app/how-it-works/data";

const prose: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "0 1rem 3rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

export function ResearchSection() {
  return (
    <div style={prose}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "2rem 0 0" }}>How It Works</h2>
      <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0.5rem 0 0" }}>
        8 peer-reviewed papers. 7 clinical ratios. One trajectory pipeline that turns blood test snapshots into a health story.
      </p>
      <p style={{ margin: "1.5rem 0 0" }}>{story}</p>

      {researchStats.length > 0 && (
        <p style={{ margin: "1.5rem 0 0" }}>
          <strong>Key findings: </strong>
          {researchStats.map((s) => `${s.number} ${s.label}${s.source ? ` (${s.source})` : ""}`).join("; ")}.
        </p>
      )}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>Technical Foundations</h3>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {papers.map((paper) => (
          <li key={paper.slug} style={{ marginBottom: "1rem" }}>
            <em>{paper.title}</em>
            {paper.authors && <> — {paper.authors}</>}
            {paper.year && <> ({paper.year})</>}
            {paper.finding && <>. <strong>Finding:</strong> {paper.finding}</>}
            {paper.relevance && <> <strong>Relevance:</strong> {paper.relevance}</>}
            {paper.url && <> <a href={paper.url} target="_blank" rel="noopener noreferrer">[link]</a></>}
          </li>
        ))}
      </ol>

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>Pipeline</h3>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {pipelineAgents.map((agent) => (
          <li key={agent.name} style={{ marginBottom: "1.25rem" }}>
            <strong>{agent.name}</strong> — {agent.description}
            {agent.researchBasis && <> <em>Research basis: {agent.researchBasis}.</em></>}
          </li>
        ))}
      </ol>
    </div>
  );
}
