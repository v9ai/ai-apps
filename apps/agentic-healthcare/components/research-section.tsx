"use client";
import {
  papers,
  researchStats,
  pipelineAgents,
  story,
} from "@/app/how-it-works/data";
import { css } from "styled-system/css";

const proseClass = css({
  maxWidth: "860px",
  margin: "0 auto",
  padding: "0 1rem 3rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
});

const h2Class = css({
  fontSize: "1.75rem",
  fontWeight: 700,
  margin: "2rem 0 0",
});

const subtitleClass = css({
  color: "var(--gray-a8)",
  margin: "0.5rem 0 0",
});

const storyClass = css({ margin: "1.5rem 0 0" });

const keyFindingsClass = css({ margin: "1.5rem 0 0" });

const h3Class = css({
  fontSize: "1.25rem",
  fontWeight: 600,
  margin: "2.5rem 0 0.75rem",
});

const olClass = css({ margin: 0, paddingLeft: "1.25rem" });

const paperItemClass = css({ marginBottom: "1rem" });

const agentItemClass = css({ marginBottom: "1.25rem" });

export function ResearchSection() {
  return (
    <div className={proseClass}>
      <h2 className={h2Class}>How It Works</h2>
      <p className={subtitleClass}>
        8 peer-reviewed papers. 7 clinical ratios. One trajectory pipeline that
        turns blood test snapshots into a health story.
      </p>
      <p className={storyClass}>{story}</p>

      {researchStats.length > 0 && (
        <p className={keyFindingsClass}>
          <strong>Key findings: </strong>
          {researchStats
            .map(
              (s) =>
                `${s.number} ${s.label}${s.source ? ` (${s.source})` : ""}`
            )
            .join("; ")}
          .
        </p>
      )}

      <h3 className={h3Class}>Technical Foundations</h3>
      <ol className={olClass}>
        {papers.map((paper) => (
          <li key={paper.slug} className={paperItemClass}>
            <em>{paper.title}</em>
            {paper.authors && <> — {paper.authors}</>}
            {paper.year && <> ({paper.year})</>}
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

      <h3 className={h3Class}>Pipeline</h3>
      <ol className={olClass}>
        {pipelineAgents.map((agent) => (
          <li key={agent.name} className={agentItemClass}>
            <strong>{agent.name}</strong> — {agent.description}
            {agent.researchBasis && (
              <> <em>Research basis: {agent.researchBasis}.</em></>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
