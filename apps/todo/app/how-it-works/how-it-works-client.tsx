"use client";
import { papers, researchStats, pipelineAgents, story, extraSections } from "./data";
import { AuthFlow, TaskFetchFlow, ScoringFlow, TaskUIFlow, PreferencesFlow } from "./architecture-flow";

const prose: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "0 1rem 3rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

const diagramHint: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--gray-a8, rgba(0,0,0,0.5))",
  margin: "0 0 0.5rem",
  fontStyle: "italic",
};

export function HowItWorksClient() {
  return (
    <div style={prose}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "2rem 0 0" }}>How It Works</h2>
      <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0.5rem 0 0" }}>
        An AI-powered task manager built with Next.js, PostgreSQL via Drizzle ORM, and Better Auth for secure authentication
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
      <p style={diagramHint}>Drag nodes to rearrange. Scroll to zoom.</p>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {pipelineAgents.map((agent, idx) => (
          <li key={agent.name} style={{ marginBottom: "1.25rem" }}>
            <strong>{agent.name}</strong> — {agent.description}
            {agent.researchBasis && <> <em>Research basis: {agent.researchBasis}.</em></>}

            {/* Flow diagram after "User Authentication" (index 0) */}
            {idx === 0 && (
              <div style={{ margin: "1rem 0" }}>
                <AuthFlow />
              </div>
            )}

            {/* Flow diagram after "Task Data Fetching" (index 1) */}
            {idx === 1 && (
              <div style={{ margin: "1rem 0" }}>
                <TaskFetchFlow />
              </div>
            )}

            {/* Flow diagram after "AI Priority Scoring" (index 2) */}
            {idx === 2 && (
              <div style={{ margin: "1rem 0" }}>
                <ScoringFlow />
              </div>
            )}

            {/* Flow diagram after "Task Management UI" (index 3) */}
            {idx === 3 && (
              <div style={{ margin: "1rem 0" }}>
                <TaskUIFlow />
              </div>
            )}

            {/* Flow diagram after "User Preferences Sync" (index 4) */}
            {idx === 4 && (
              <div style={{ margin: "1rem 0" }}>
                <PreferencesFlow />
              </div>
            )}
          </li>
        ))}
      </ol>

      {extraSections.map((section, i) => (
        <div key={i}>
          <hr style={{ border: "none", borderTop: "1px solid var(--gray-a3, rgba(0,0,0,0.08))", margin: "2.5rem 0" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>{section.heading}</h3>
          <p>{section.content}</p>
        </div>
      ))}
    </div>
  );
}
