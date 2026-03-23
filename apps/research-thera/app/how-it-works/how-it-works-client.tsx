"use client";
import { useState } from "react";
import { papers, researchStats, pipelineNodes, reactAgent, story, extraSections, type PipelineNode } from "./data";

// ── Shared styles ────────────────────────────────────────────────────────────

const prose: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "0 1rem 4rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

const sectionHead: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  margin: "2.5rem 0 0.75rem",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--gray-a3, rgba(255,255,255,0.08))",
  margin: "2.5rem 0",
};

// ── LangGraph node type → accent color ──────────────────────────────────────

const TYPE_COLORS: Record<PipelineNode["nodeType"], string> = {
  context: "var(--blue-9)",
  ai:      "var(--amber-9)",
  plan:    "var(--orange-9)",
  search:  "var(--cyan-9)",
  enrich:  "var(--teal-9)",
  extract: "var(--red-9)",
  persist: "var(--purple-9)",
};

const TYPE_LABELS: Record<PipelineNode["nodeType"], string> = {
  context: "Context",
  ai:      "AI / LLM",
  plan:    "Planner",
  search:  "Search",
  enrich:  "Enrich",
  extract: "Extract",
  persist: "Persist",
};

// ── Node card in the pipeline graph ─────────────────────────────────────────

function NodeCard({
  node,
  isSelected,
  onClick,
}: {
  node: PipelineNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const accent = TYPE_COLORS[node.nodeType];

  const card: React.CSSProperties = {
    minWidth: 120,
    maxWidth: 140,
    background: isSelected
      ? "var(--gray-a3, rgba(255,255,255,0.06))"
      : "var(--gray-a2, rgba(255,255,255,0.03))",
    border: `1px solid ${isSelected ? accent : "var(--gray-a4, rgba(255,255,255,0.1))"}`,
    borderTop: `3px solid ${accent}`,
    borderRadius: 8,
    padding: "0.65rem 0.75rem",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    boxShadow: isSelected ? `0 0 0 2px ${accent}22` : "none",
    flexShrink: 0,
  };

  const badge: React.CSSProperties = {
    display: "inline-block",
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: accent,
    background: `${accent}1a`,
    borderRadius: 4,
    padding: "1px 5px",
    marginBottom: "0.4rem",
  };

  const progress: React.CSSProperties = {
    fontSize: "0.65rem",
    color: "var(--gray-a8, rgba(255,255,255,0.4))",
    marginTop: "0.4rem",
    fontFamily: "monospace",
  };

  return (
    <div style={card} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div style={badge}>{TYPE_LABELS[node.nodeType]}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "monospace", lineHeight: 1.3 }}>
        {node.name}()
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--gray-a9, rgba(255,255,255,0.5))", marginTop: "0.3rem", lineHeight: 1.35 }}>
        {node.shortDesc}
      </div>
      <div style={progress}>{node.progress}%</div>
    </div>
  );
}

// ── Arrow between nodes ──────────────────────────────────────────────────────

function Arrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color: "var(--gray-a6, rgba(255,255,255,0.25))",
        fontSize: "1.25rem",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      →
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        height: 4,
        background: "var(--gray-a3, rgba(255,255,255,0.08))",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: "0.5rem",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── Detail panel for selected node ──────────────────────────────────────────

function NodeDetail({ node }: { node: PipelineNode }) {
  const accent = TYPE_COLORS[node.nodeType];

  const panel: React.CSSProperties = {
    marginTop: "1.25rem",
    padding: "1.25rem 1.5rem",
    background: "var(--gray-a2, rgba(255,255,255,0.03))",
    border: `1px solid var(--gray-a4, rgba(255,255,255,0.1))`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 8,
  };

  return (
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" }}>
          {node.name}()
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: accent,
            background: `${accent}1a`,
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          {TYPE_LABELS[node.nodeType]}
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--gray-a8, rgba(255,255,255,0.4))", marginLeft: "auto", fontFamily: "monospace" }}>
          progress → {node.progress}%
        </span>
      </div>
      <ProgressBar value={node.progress} color={accent} />
      <p style={{ margin: "0.75rem 0 0", fontSize: "0.95rem" }}>{node.description}</p>
      {node.researchBasis && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
          <strong style={{ color: "var(--gray-a11, rgba(255,255,255,0.7))" }}>Pattern:</strong>{" "}
          {node.researchBasis}
        </p>
      )}
      {node.detail && (
        <pre
          style={{
            margin: "0.75rem 0 0",
            padding: "0.6rem 0.9rem",
            background: "var(--gray-a3, rgba(255,255,255,0.05))",
            borderRadius: 6,
            fontSize: "0.72rem",
            color: accent,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {node.detail}
        </pre>
      )}
    </div>
  );
}

// ── Full pipeline graph section ──────────────────────────────────────────────

function ResearchPipelineGraph() {
  const [selected, setSelected] = useState<number>(0);

  return (
    <div>
      {/* LangGraph label */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, var(--red-9), var(--orange-9))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          LangGraph Pipeline
        </span>
        <div style={{ height: 1, flex: 1, background: "var(--gray-a3, rgba(255,255,255,0.08))" }} />
        <span style={{ fontSize: "0.72rem", color: "var(--gray-a7, rgba(255,255,255,0.35))", fontFamily: "monospace" }}>
          generateTherapyResearch.workflow.ts
        </span>
      </div>

      {/* Node flow — horizontal scroll on small screens */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        {pipelineNodes.map((node, i) => (
          <div key={node.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {i > 0 && <Arrow />}
            <NodeCard
              node={node}
              isSelected={selected === i}
              onClick={() => setSelected(i)}
            />
          </div>
        ))}
      </div>

      {/* Selected node detail */}
      <NodeDetail node={pipelineNodes[selected]} />
    </div>
  );
}

// ── Python LangGraph ReAct agent diagram ────────────────────────────────────

function ReactAgentDiagram() {
  const boxStyle = (color: string): React.CSSProperties => ({
    border: `1px solid ${color}`,
    borderRadius: 8,
    padding: "0.75rem 1rem",
    background: `${color}0d`,
    fontSize: "0.85rem",
  });

  const agentBox: React.CSSProperties = {
    ...boxStyle("var(--indigo-9)"),
    borderTop: "3px solid var(--indigo-9)",
    flex: 1,
  };

  const toolBox: React.CSSProperties = {
    ...boxStyle("var(--green-9)"),
    borderTop: "3px solid var(--green-9)",
    flex: 1,
  };

  const dbBox: React.CSSProperties = {
    ...boxStyle("var(--purple-9)"),
    borderTop: "3px solid var(--purple-9)",
    flex: 1,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, var(--indigo-9), var(--blue-9))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          LangGraph ReAct Agent
        </span>
        <div style={{ height: 1, flex: 1, background: "var(--gray-a3, rgba(255,255,255,0.08))" }} />
        <span style={{ fontSize: "0.72rem", color: "var(--gray-a7, rgba(255,255,255,0.35))", fontFamily: "monospace" }}>
          backend/src/agent/graph.py
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "stretch" }}>
        {/* Agent node */}
        <div style={agentBox}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--indigo-9)",
              marginBottom: "0.4rem",
            }}
          >
            Agent Node
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>
            create_react_agent
          </div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            model: <code>gpt-4o-mini</code>
          </div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
            Reasons over research chunks, decides when to call the search tool, synthesizes a final answer.
          </div>
        </div>

        {/* Bidirectional arrow */}
        <div style={{ display: "flex", alignItems: "center", color: "var(--gray-a6)", fontSize: "1.1rem", flexShrink: 0 }}>
          ⇄
        </div>

        {/* Tool node */}
        <div style={toolBox}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--green-9)",
              marginBottom: "0.4rem",
            }}
          >
            Tool Node
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>
            search_therapy_research
          </div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            Embeds query with <code>text-embedding-3-small</code>, runs pgvector cosine similarity, returns top-5 chunks.
          </div>
          <pre
            style={{
              margin: "0.6rem 0 0",
              padding: "0.4rem 0.6rem",
              background: "var(--gray-a3, rgba(255,255,255,0.05))",
              borderRadius: 5,
              fontSize: "0.65rem",
              color: "var(--green-9)",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {`1 - (embedding <-> query_vec) AS similarity\nFROM research_embeddings LIMIT 5`}
          </pre>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", alignItems: "center", color: "var(--gray-a6)", fontSize: "1.1rem", flexShrink: 0 }}>
          →
        </div>

        {/* DB node */}
        <div style={dbBox}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--purple-9)",
              marginBottom: "0.4rem",
            }}
          >
            Vector Store
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>
            research_embeddings
          </div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            Neon PostgreSQL + pgvector. Populated by the <code>persist</code> pipeline node. 1024-dim embeddings, one row per research chunk.
          </div>
        </div>
      </div>

      <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        The ReAct loop runs until the agent determines it has enough evidence to answer — typically 1–2 tool calls. Results from the research generation pipeline feed directly into this store.
      </p>
    </div>
  );
}

// ── Stats row ────────────────────────────────────────────────────────────────

function StatsRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "0.75rem",
        margin: "1.5rem 0",
      }}
    >
      {researchStats.map((s) => (
        <div
          key={s.number}
          style={{
            padding: "0.75rem 1rem",
            background: "var(--gray-a2, rgba(255,255,255,0.03))",
            border: "1px solid var(--gray-a3, rgba(255,255,255,0.08))",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "monospace", color: "var(--accent-9, var(--indigo-9))" }}>
            {s.number}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--gray-a9, rgba(255,255,255,0.5))", marginTop: "0.25rem", lineHeight: 1.4 }}>
            {s.label}
          </div>
          {s.source && (
            <div style={{ fontSize: "0.68rem", color: "var(--gray-a7, rgba(255,255,255,0.3))", marginTop: "0.25rem", lineHeight: 1.3 }}>
              {s.source}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function HowItWorksClient() {
  return (
    <div style={prose}>
      {/* Header */}
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "2rem 0 0" }}>How It Works</h2>
      <p style={{ color: "var(--gray-a8, rgba(255,255,255,0.4))", margin: "0.5rem 0 0" }}>
        A therapeutic journaling platform that connects personal mental health goals with peer-reviewed research via a 7-node LangGraph pipeline, a ReAct RAG agent, and a GraphQL API.
      </p>
      <p style={{ margin: "1.5rem 0 0" }}>{story}</p>

      {/* Stats */}
      <StatsRow />

      {/* Research pipeline graph */}
      <hr style={divider} />
      <h3 style={sectionHead}>Research Generation Pipeline</h3>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        Click any node to see its implementation details. Progress percentages reflect real values written to{" "}
        <code>generation_jobs</code> and polled by the client.
      </p>
      <ResearchPipelineGraph />

      {/* ReAct agent */}
      <hr style={divider} />
      <h3 style={sectionHead}>RAG Chat Agent</h3>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        A separate Python LangGraph service answers user questions by reasoning over the research stored in pgvector.
      </p>
      <ReactAgentDiagram />

      {/* Technical stack */}
      <hr style={divider} />
      <h3 style={sectionHead}>Technical Foundations</h3>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {papers.map((paper) => (
          <li key={paper.slug} style={{ marginBottom: "1rem" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: paper.categoryColor,
                marginRight: "0.4rem",
              }}
            >
              [{paper.category}]
            </span>
            <em>{paper.title}</em>
            {paper.authors && <> — {paper.authors}</>}
            {paper.year && <> ({paper.year})</>}
            {paper.finding && <>. <strong>Finding:</strong> {paper.finding}</>}
            {paper.relevance && <> <strong>Relevance:</strong> {paper.relevance}</>}
            {paper.url && (
              <>
                {" "}
                <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-9)" }}>
                  [docs]
                </a>
              </>
            )}
          </li>
        ))}
      </ol>

      {/* Extra sections */}
      {extraSections.map((section, i) => (
        <div key={i}>
          <hr style={divider} />
          <h3 style={{ ...sectionHead, margin: "0 0 0.75rem" }}>{section.heading}</h3>
          <p style={{ margin: 0 }}>{section.content}</p>
        </div>
      ))}
    </div>
  );
}
