"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { papers, researchStats, pipelineNodes, story, extraSections, type PipelineNode } from "./data";

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

// ── LangGraph node type → accent color / label ───────────────────────────────

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

// ── Enhancement 1: Hover-aware NodeCard ──────────────────────────────────────

function NodeCard({
  node,
  index,
  isSelected,
  onClick,
  cardRef,
}: {
  node: PipelineNode;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = TYPE_COLORS[node.nodeType];

  const card: React.CSSProperties = {
    minWidth: 120,
    maxWidth: 140,
    background:
      isSelected
        ? "var(--gray-a3, rgba(255,255,255,0.07))"
        : hovered
        ? "var(--gray-a2, rgba(255,255,255,0.05))"
        : "var(--gray-a1, rgba(255,255,255,0.02))",
    border: `1px solid ${isSelected || hovered ? accent : "var(--gray-a4, rgba(255,255,255,0.1))"}`,
    borderTop: `3px solid ${accent}`,
    borderRadius: 8,
    padding: "0.65rem 0.75rem",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.12s",
    boxShadow: isSelected ? `0 0 0 2px ${accent}28` : hovered ? `0 2px 8px ${accent}18` : "none",
    transform: hovered && !isSelected ? "translateY(-1px)" : "none",
    flexShrink: 0,
  };

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      style={card}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div
        style={{
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
        }}
      >
        {TYPE_LABELS[node.nodeType]}
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "monospace", lineHeight: 1.3 }}>
        {node.name}()
      </div>
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--gray-a9, rgba(255,255,255,0.5))",
          marginTop: "0.3rem",
          lineHeight: 1.35,
        }}
      >
        {node.shortDesc}
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--gray-a7, rgba(255,255,255,0.35))", marginTop: "0.4rem", fontFamily: "monospace" }}>
        {node.progress}%
      </div>
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
        color: "var(--gray-a5, rgba(255,255,255,0.2))",
        fontSize: "1.1rem",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      →
    </div>
  );
}

// ── Enhancement 2: START / END bookend pills ─────────────────────────────────

function BookendPill({ label }: { label: "START" | "END" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.3rem 0.7rem",
        border: "1px dashed var(--gray-a5, rgba(255,255,255,0.2))",
        borderRadius: 20,
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "var(--gray-a7, rgba(255,255,255,0.35))",
        flexShrink: 0,
        fontFamily: "monospace",
      }}
    >
      {label}
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
          transition: "width 0.45s ease",
        }}
      />
    </div>
  );
}

// ── Enhancement 7: Copy button for code snippets ─────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        position: "absolute",
        top: "0.4rem",
        right: "0.4rem",
        background: "var(--gray-a3, rgba(255,255,255,0.08))",
        border: "none",
        borderRadius: 4,
        color: copied ? "var(--green-9)" : "var(--gray-a8, rgba(255,255,255,0.4))",
        cursor: "pointer",
        fontSize: "0.62rem",
        padding: "2px 6px",
        fontFamily: "monospace",
        transition: "color 0.15s",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

// ── Enhancement 5+7: NodeDetail with step indicator + copy button ────────────

function NodeDetail({ node, index, total }: { node: PipelineNode; index: number; total: number }) {
  const accent = TYPE_COLORS[node.nodeType];

  return (
    <div
      style={{
        marginTop: "1.25rem",
        padding: "1.25rem 1.5rem",
        background: "var(--gray-a2, rgba(255,255,255,0.03))",
        border: "1px solid var(--gray-a4, rgba(255,255,255,0.1))",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
      }}
    >
      {/* Header row */}
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
        {/* Enhancement 5: step indicator */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.72rem",
            color: "var(--gray-a7, rgba(255,255,255,0.35))",
            fontFamily: "monospace",
          }}
        >
          node {index + 1} / {total} · progress → {node.progress}%
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

      {/* Enhancement 7: code block with copy button */}
      {node.detail && (
        <div style={{ position: "relative", marginTop: "0.75rem" }}>
          <pre
            style={{
              margin: 0,
              padding: "0.6rem 2.5rem 0.6rem 0.9rem",
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
          <CopyButton text={node.detail} />
        </div>
      )}
    </div>
  );
}

// ── Enhancement 6: Node type legend ─────────────────────────────────────────

function NodeTypeLegend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginTop: "0.9rem",
      }}
    >
      {(Object.keys(TYPE_COLORS) as PipelineNode["nodeType"][]).map((type) => (
        <div
          key={type}
          style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "var(--gray-a8, rgba(255,255,255,0.4))" }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: TYPE_COLORS[type],
              flexShrink: 0,
            }}
          />
          {TYPE_LABELS[type]}
        </div>
      ))}
    </div>
  );
}

// ── Enhancements 3 + 9: Pipeline graph with keyboard nav + auto-scroll ────────

function ResearchPipelineGraph() {
  const [selected, setSelected] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Enhancement 3: keyboard ← → navigation
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setSelected((s) => Math.min(s + 1, pipelineNodes.length - 1));
      } else if (e.key === "ArrowLeft") {
        setSelected((s) => Math.max(s - 1, 0));
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Enhancement 9: auto-scroll selected card into view
  useEffect(() => {
    const el = cardRefs.current[selected];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selected]);

  return (
    <div>
      {/* Section header row */}
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
        <span
          style={{
            fontSize: "0.68rem",
            color: "var(--gray-a6, rgba(255,255,255,0.28))",
            fontFamily: "monospace",
          }}
        >
          ← → to navigate
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--gray-a7, rgba(255,255,255,0.35))", fontFamily: "monospace" }}>
          generateTherapyResearch.workflow.ts
        </span>
      </div>

      {/* Enhancement 2: START bookend + node flow + END bookend */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        <BookendPill label="START" />
        <Arrow />
        {pipelineNodes.map((node, i) => (
          <div key={node.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <NodeCard
              node={node}
              index={i}
              isSelected={selected === i}
              onClick={() => setSelected(i)}
              cardRef={{ current: null } as React.RefObject<HTMLDivElement | null>}
            />
            {i < pipelineNodes.length - 1 && <Arrow />}
          </div>
        ))}
        <Arrow />
        <BookendPill label="END" />
      </div>

      {/* Enhancement 6: legend */}
      <NodeTypeLegend />

      {/* Enhancement 5: detail with step counter */}
      <NodeDetail node={pipelineNodes[selected]} index={selected} total={pipelineNodes.length} />
    </div>
  );
}

// ── Python LangGraph ReAct agent diagram ────────────────────────────────────

function ReactAgentDiagram() {
  const boxStyle = (color: string): React.CSSProperties => ({
    border: `1px solid ${color}44`,
    borderTop: `3px solid ${color}`,
    borderRadius: 8,
    padding: "0.75rem 1rem",
    background: `${color}0a`,
    fontSize: "0.85rem",
    flex: 1,
  });

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
        <div style={boxStyle("var(--indigo-9)")}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--indigo-9)", marginBottom: "0.4rem" }}>
            Agent Node
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>create_react_agent</div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            model: <code>gpt-4o-mini</code>
          </div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem", marginTop: "0.2rem" }}>
            Reasons over research chunks, decides when to call the search tool, synthesizes a final answer.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", color: "var(--gray-a6)", fontSize: "1.1rem", flexShrink: 0 }}>⇄</div>

        {/* Tool node */}
        <div style={boxStyle("var(--green-9)")}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--green-9)", marginBottom: "0.4rem" }}>
            Tool Node
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>search_therapy_research</div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            Embeds query with <code>text-embedding-3-small</code>, cosine similarity → top-5 chunks.
          </div>
          <div style={{ position: "relative", marginTop: "0.6rem" }}>
            <pre
              style={{
                margin: 0,
                padding: "0.4rem 2.2rem 0.4rem 0.6rem",
                background: "var(--gray-a3, rgba(255,255,255,0.05))",
                borderRadius: 5,
                fontSize: "0.65rem",
                color: "var(--green-9)",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
              }}
            >
              {`1 - (embedding <-> query_vec)\nFROM research_embeddings LIMIT 5`}
            </pre>
            <CopyButton text="SELECT title, content, 1 - (embedding <-> query_vec) AS similarity FROM research_embeddings ORDER BY embedding <-> query_vec LIMIT 5" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", color: "var(--gray-a6)", fontSize: "1.1rem", flexShrink: 0 }}>→</div>

        {/* DB node */}
        <div style={boxStyle("var(--purple-9)")}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--purple-9)", marginBottom: "0.4rem" }}>
            Vector Store
          </div>
          <div style={{ fontFamily: "monospace", fontWeight: 600, marginBottom: "0.3rem" }}>research_embeddings</div>
          <div style={{ color: "var(--gray-a9, rgba(255,255,255,0.5))", fontSize: "0.8rem" }}>
            Neon PostgreSQL + pgvector. Populated by the <code>persist</code> node. 1024-dim embeddings.
          </div>
        </div>
      </div>

      <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        The ReAct loop runs until the agent has enough evidence — typically 1–2 tool calls. The research generation pipeline feeds directly into this store.
      </p>
    </div>
  );
}

// ── Enhancement 4: Stat card with left accent border ────────────────────────

function StatsRow() {
  const ACCENT_COLORS = [
    "var(--indigo-9)",
    "var(--cyan-9)",
    "var(--purple-9)",
    "var(--green-9)",
    "var(--orange-9)",
    "var(--blue-9)",
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "0.75rem",
        margin: "1.5rem 0",
      }}
    >
      {researchStats.map((s, i) => (
        <div
          key={s.number}
          style={{
            padding: "0.75rem 1rem",
            background: "var(--gray-a2, rgba(255,255,255,0.03))",
            border: "1px solid var(--gray-a3, rgba(255,255,255,0.08))",
            borderLeft: `3px solid ${ACCENT_COLORS[i % ACCENT_COLORS.length]}`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              fontFamily: "monospace",
              color: ACCENT_COLORS[i % ACCENT_COLORS.length],
            }}
          >
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

// ── Enhancement 10: Paper category filter ────────────────────────────────────

function TechFoundations() {
  const categories = Array.from(new Set(papers.map((p) => p.category)));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visible = activeCategory ? papers.filter((p) => p.category === activeCategory) : papers;

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "2px 10px",
            borderRadius: 20,
            border: `1px solid ${activeCategory === null ? "var(--indigo-9)" : "var(--gray-a4, rgba(255,255,255,0.12))"}`,
            background: activeCategory === null ? "var(--indigo-9)22" : "transparent",
            color: activeCategory === null ? "var(--indigo-9)" : "var(--gray-a8, rgba(255,255,255,0.4))",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          All
        </button>
        {categories.map((cat) => {
          const color = papers.find((p) => p.category === cat)?.categoryColor ?? "var(--gray-9)";
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              style={{
                padding: "2px 10px",
                borderRadius: 20,
                border: `1px solid ${isActive ? color : "var(--gray-a4, rgba(255,255,255,0.12))"}`,
                background: isActive ? `${color}22` : "transparent",
                color: isActive ? color : "var(--gray-a8, rgba(255,255,255,0.4))",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Paper list */}
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {visible.map((paper) => (
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
    </div>
  );
}

// ── Enhancement 8: Gradient page header ──────────────────────────────────────

function PageHeader() {
  return (
    <div
      style={{
        margin: "2rem 0 0",
        padding: "1.5rem 1.5rem 1.25rem",
        borderRadius: 10,
        background:
          "linear-gradient(135deg, var(--indigo-a2, rgba(82,102,255,0.06)) 0%, var(--gray-a1, rgba(255,255,255,0.01)) 60%)",
        border: "1px solid var(--gray-a3, rgba(255,255,255,0.07))",
      }}
    >
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>How It Works</h2>
      <p style={{ color: "var(--gray-a8, rgba(255,255,255,0.4))", margin: "0.5rem 0 0", fontSize: "0.95rem" }}>
        A therapeutic journaling platform connecting mental health goals with peer-reviewed research — via a 7-node LangGraph pipeline, a ReAct RAG agent, and a GraphQL API.
      </p>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function HowItWorksClient() {
  return (
    <div style={prose}>
      {/* Enhancement 8: gradient header */}
      <PageHeader />

      <p style={{ margin: "1.5rem 0 0" }}>{story}</p>

      {/* Enhancement 4: stat cards with left accent borders */}
      <StatsRow />

      {/* Research pipeline graph */}
      <hr style={divider} />
      <h3 style={sectionHead}>Research Generation Pipeline</h3>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        Click any node — or use ← → keys — to inspect its implementation. Progress values are real numbers written to{" "}
        <code>generation_jobs</code> and polled by the client every second.
      </p>

      {/* Enhancements 1, 2, 3, 5, 6, 7, 9 */}
      <ResearchPipelineGraph />

      {/* ReAct agent */}
      <hr style={divider} />
      <h3 style={sectionHead}>RAG Chat Agent</h3>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", color: "var(--gray-a9, rgba(255,255,255,0.5))" }}>
        A separate Python LangGraph service answers user questions by reasoning over the research stored in pgvector.
      </p>
      <ReactAgentDiagram />

      {/* Technical stack — Enhancement 10: category filter */}
      <hr style={divider} />
      <h3 style={sectionHead}>Technical Foundations</h3>
      <TechFoundations />

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
