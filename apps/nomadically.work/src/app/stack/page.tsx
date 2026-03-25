"use client";

import { useState } from "react";
import { Badge, Container, Flex, Heading, Text, Card } from "@radix-ui/themes";
import { LayersIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

// ── Types ────────────────────────────────────────────────────────────────────

type NodeType = "start" | "end" | "process" | "ai";

type PipelineNode = {
  id: string;
  label: string;
  sublabel: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  color: string;
  description: string;
  tech: { name: string; version?: string }[];
  dataIn: string;
  dataOut: string;
  insight: string;
};

type PipelineEdge = {
  from: string;
  to: string;
  path: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  dashed?: boolean;
};

// ── Node Data ────────────────────────────────────────────────────────────────

const NODE_H = 52;

const NODES: PipelineNode[] = [
  {
    id: "__start__",
    label: "START",
    sublabel: "",
    type: "start",
    x: 360,
    y: 30,
    w: 0,
    color: "green",
    description: "",
    tech: [],
    dataIn: "",
    dataOut: "",
    insight: "",
  },
  {
    id: "discover",
    label: "Discover",
    sublabel: "Board Crawl",
    type: "process",
    x: 360,
    y: 130,
    w: 200,
    color: "green",
    description:
      "Crawl Common Crawl CDX index to discover Ashby job boards. Greenhouse and Lever boards are registered via API discovery or manual entry.",
    tech: [
      { name: "ashby-crawler", version: "Rust" },
      { name: "Common Crawl CDX" },
      { name: "Neon PostgreSQL" },
    ],
    dataIn: "Common Crawl web archives",
    dataOut: "Discovered ATS board URLs",
    insight:
      "Automated board discovery via web archive analysis reduces manual registration to near-zero",
  },
  {
    id: "ingest",
    label: "Ingest",
    sublabel: "ATS APIs",
    type: "process",
    x: 360,
    y: 240,
    w: 200,
    color: "blue",
    description:
      "Pull job listings from ATS platforms (Greenhouse, Lever, Ashby) into Neon PostgreSQL. A unified ingestion layer normalizes data from 3 different API formats into one schema.",
    tech: [
      { name: "Trigger.dev", version: "v3" },
      { name: "Greenhouse API" },
      { name: "Lever API" },
      { name: "Ashby API" },
      { name: "Drizzle ORM" },
    ],
    dataIn: "ATS board URLs",
    dataOut: "Raw job records in Neon",
    insight:
      "Unified ingestion normalizes 3 different ATS API formats into a single Drizzle schema",
  },
  {
    id: "enhance",
    label: "Enhance",
    sublabel: "Job Details",
    type: "process",
    x: 360,
    y: 350,
    w: 200,
    color: "blue",
    description:
      "Fetch full job details — descriptions, requirements, benefits, locations — from ATS APIs for each discovered job. Runs as background tasks with concurrency limits and retry logic.",
    tech: [
      { name: "Trigger.dev", version: "v3" },
      { name: "ATS API clients" },
      { name: "GraphQL mutations" },
    ],
    dataIn: "Job IDs from ingestion",
    dataOut: "Enriched records with full descriptions",
    insight:
      "Batch processing with configurable concurrency and exponential backoff retry",
  },
  {
    id: "classify",
    label: "Classify",
    sublabel: "Remote EU Detection",
    type: "ai",
    x: 360,
    y: 460,
    w: 200,
    color: "violet",
    description:
      "Use DeepSeek LLM to determine if a job is genuinely remote-friendly for EU-based workers. Schema-constrained output with Zod validation ensures structured, reliable classification.",
    tech: [
      { name: "DeepSeek AI", version: "2.0" },
      { name: "Vercel AI SDK" },
      { name: "Zod" },
    ],
    dataIn: "Job description text",
    dataOut: "is_remote_eu boolean + confidence score",
    insight:
      "Schema-constrained LLM output prevents hallucination; eval-first approach with 80%+ accuracy bar",
  },
  {
    id: "extract",
    label: "Extract Skills",
    sublabel: "LLM Pipeline",
    type: "ai",
    x: 360,
    y: 580,
    w: 200,
    color: "violet",
    description:
      "Extract technical skills and requirements from job descriptions using an LLM pipeline. All extracted skills are validated against a curated taxonomy to prevent drift.",
    tech: [
      { name: "LLM pipeline" },
      { name: "Skill taxonomy" },
      { name: "Vector operations" },
    ],
    dataIn: "Job description text",
    dataOut: "Structured skill tags in Neon",
    insight:
      "Grounding-first: skills validated against curated taxonomy prevents semantic drift",
  },
  {
    id: "serve",
    label: "Serve",
    sublabel: "GraphQL + UI",
    type: "process",
    x: 220,
    y: 710,
    w: 180,
    color: "indigo",
    description:
      "Apollo Server 5 GraphQL API serves classified, skill-tagged jobs to the Next.js frontend. DataLoaders prevent N+1 queries. Typed resolvers from codegen ensure end-to-end type safety.",
    tech: [
      { name: "Apollo Server", version: "5" },
      { name: "GraphQL" },
      { name: "DataLoader" },
      { name: "Next.js", version: "16" },
      { name: "React", version: "19" },
      { name: "Radix UI" },
    ],
    dataIn: "User queries (filters, search, pagination)",
    dataOut: "Paginated job listings + skill data",
    insight:
      "DataLoaders batch and cache DB queries; typed resolvers prevent runtime mismatches",
  },
  {
    id: "match",
    label: "Match",
    sublabel: "Resume RAG",
    type: "ai",
    x: 500,
    y: 710,
    w: 180,
    color: "violet",
    description:
      "Vector similarity search matches user resumes against job requirements and extracted skills. Semantic matching goes beyond keyword overlap to surface truly relevant positions.",
    tech: [
      { name: "resume-rag", version: "Python" },
      { name: "Cloudflare Vectorize" },
      { name: "Embeddings" },
    ],
    dataIn: "Resume text + job skill vectors",
    dataOut: "Ranked job matches by similarity",
    insight:
      "Semantic vector matching finds relevant jobs that keyword search would miss",
  },
  {
    id: "__end__",
    label: "END",
    sublabel: "",
    type: "end",
    x: 360,
    y: 840,
    w: 0,
    color: "gray",
    description: "",
    tech: [],
    dataIn: "",
    dataOut: "",
    insight: "",
  },
];

// ── Edge Data ────────────────────────────────────────────────────────────────

const EDGES: PipelineEdge[] = [
  { from: "__start__", to: "discover", path: "M 360,44 L 360,104" },
  { from: "discover", to: "ingest", path: "M 360,156 L 360,214" },
  { from: "ingest", to: "enhance", path: "M 360,266 L 360,324" },
  { from: "enhance", to: "classify", path: "M 360,376 L 360,434" },
  {
    from: "classify",
    to: "extract",
    path: "M 360,486 L 360,554",
    label: "is_remote_eu",
    labelX: 268,
    labelY: 524,
  },
  {
    from: "classify",
    to: "__end__",
    path: "M 460,460 L 630,460 Q 650,460 650,480 L 650,820 Q 650,840 630,840 L 374,840",
    label: "filtered",
    labelX: 662,
    labelY: 650,
    dashed: true,
  },
  {
    from: "extract",
    to: "serve",
    path: "M 360,606 C 360,650 220,650 220,684",
  },
  {
    from: "extract",
    to: "match",
    path: "M 360,606 C 360,650 500,650 500,684",
  },
  {
    from: "serve",
    to: "__end__",
    path: "M 220,736 C 220,790 360,790 360,826",
  },
  {
    from: "match",
    to: "__end__",
    path: "M 500,736 C 500,790 360,790 360,826",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const nodeMap = new Map(NODES.map((n) => [n.id, n]));

function isClickable(node: PipelineNode) {
  return node.type !== "start" && node.type !== "end";
}

// ── SVG Components ───────────────────────────────────────────────────────────

function StartEndNode({
  node,
  isSelected,
  onClick,
}: {
  node: PipelineNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isStart = node.type === "start";
  const r = 16;
  return (
    <g
      onClick={onClick}
      style={{ cursor: isClickable(node) ? "pointer" : "default" }}
    >
      {/* outer circle */}
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        fill={isStart ? "var(--green-9)" : "none"}
        stroke={isStart ? "none" : "var(--gray-9)"}
        strokeWidth={isStart ? 0 : 2.5}
      />
      {/* inner filled circle for END */}
      {!isStart && (
        <circle cx={node.x} cy={node.y} r={r - 5} fill="var(--gray-9)" />
      )}
      {/* label */}
      <text
        x={node.x}
        y={isStart ? node.y + r + 16 : node.y - r - 8}
        textAnchor="middle"
        fill="var(--gray-9)"
        fontSize={10}
        fontFamily="monospace"
        fontWeight={600}
        letterSpacing="0.08em"
      >
        {isStart ? "__start__" : "__end__"}
      </text>
    </g>
  );
}

function ProcessNode({
  node,
  isSelected,
  onClick,
}: {
  node: PipelineNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const h = NODE_H;
  const w = node.w;
  const rx = node.x - w / 2;
  const ry = node.y - h / 2;
  const isAi = node.type === "ai";
  const strokeColor = isSelected
    ? `var(--${node.color}-9)`
    : "var(--gray-6)";
  const fillColor = isSelected
    ? `var(--${node.color}-2)`
    : "var(--gray-2)";

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <rect
        x={rx}
        y={ry}
        width={w}
        height={h}
        rx={6}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
      />
      {/* AI indicator dot */}
      {isAi && (
        <circle
          cx={rx + 14}
          cy={node.y}
          r={3}
          fill={`var(--${node.color}-9)`}
        />
      )}
      {/* main label */}
      <text
        x={node.x + (isAi ? 4 : 0)}
        y={node.y - 4}
        textAnchor="middle"
        fill="var(--gray-12)"
        fontSize={13}
        fontWeight={600}
      >
        {node.label}
      </text>
      {/* sublabel */}
      <text
        x={node.x + (isAi ? 4 : 0)}
        y={node.y + 14}
        textAnchor="middle"
        fill="var(--gray-9)"
        fontSize={10}
      >
        {node.sublabel}
      </text>
    </g>
  );
}

function PipelineGraph({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <svg
      viewBox="0 0 720 880"
      style={{ width: "100%", maxWidth: 720 }}
      role="img"
      aria-label="Pipeline diagram showing how jobs flow from discovery to serving"
    >
      <style>{`
        @keyframes flow {
          to { stroke-dashoffset: -12; }
        }
        .edge-line {
          stroke-dasharray: 6 3;
          animation: flow 1.2s linear infinite;
        }
        .edge-line-dashed {
          stroke-dasharray: 4 4;
          opacity: 0.4;
        }
        .edge-line-selected {
          stroke-dasharray: 6 3;
          animation: flow 0.8s linear infinite;
          opacity: 1;
        }
      `}</style>

      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,4 L0,8 Z" fill="var(--gray-7)" />
        </marker>
        <marker
          id="arrow-dim"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,4 L0,8 Z" fill="var(--gray-6)" opacity={0.4} />
        </marker>
        <marker
          id="arrow-selected"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,4 L0,8 Z" fill="var(--accent-9)" />
        </marker>
      </defs>

      {/* Edges */}
      {EDGES.map((edge, i) => {
        const isConnected =
          selectedId && (edge.from === selectedId || edge.to === selectedId);
        const className = edge.dashed
          ? "edge-line-dashed"
          : isConnected
            ? "edge-line-selected"
            : "edge-line";
        const markerEnd = edge.dashed
          ? "url(#arrow-dim)"
          : isConnected
            ? "url(#arrow-selected)"
            : "url(#arrow)";

        return (
          <g key={i}>
            <path
              d={edge.path}
              fill="none"
              stroke={
                isConnected ? "var(--accent-9)" : edge.dashed ? "var(--gray-6)" : "var(--gray-7)"
              }
              strokeWidth={isConnected ? 2 : 1.5}
              className={className}
              markerEnd={markerEnd}
            />
            {edge.label && edge.labelX != null && edge.labelY != null && (
              <>
                <rect
                  x={edge.labelX - 2}
                  y={edge.labelY - 10}
                  width={
                    edge.label.length * 6.5 + 8
                  }
                  height={16}
                  rx={2}
                  fill="var(--color-background)"
                  opacity={0.9}
                />
                <text
                  x={edge.labelX + 2}
                  y={edge.labelY + 1}
                  fill={edge.dashed ? "var(--gray-8)" : "var(--green-9)"}
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {edge.label}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {NODES.map((node) => {
        const selected = selectedId === node.id;
        const handleClick = () => {
          if (!isClickable(node)) return;
          onSelect(selected ? null : node.id);
        };

        if (node.type === "start" || node.type === "end") {
          return (
            <StartEndNode
              key={node.id}
              node={node}
              isSelected={selected}
              onClick={handleClick}
            />
          );
        }
        return (
          <ProcessNode
            key={node.id}
            node={node}
            isSelected={selected}
            onClick={handleClick}
          />
        );
      })}

      {/* Neon DB indicator (central store) */}
      <g opacity={0.6}>
        <text
          x={660}
          y={350}
          textAnchor="middle"
          fill="var(--cyan-9)"
          fontSize={9}
          fontFamily="monospace"
          transform="rotate(90, 660, 350)"
        >
          Neon PostgreSQL
        </text>
        <line
          x1={672}
          y1={140}
          x2={672}
          y2={580}
          stroke="var(--cyan-6)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      </g>
    </svg>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function NodeDetail({ node }: { node: PipelineNode }) {
  return (
    <Card
      mt="5"
      style={{
        borderLeft: `3px solid var(--${node.color}-9)`,
        background: "var(--gray-2)",
      }}
    >
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4">{node.label}</Heading>
          <Badge
            size="1"
            variant="soft"
            color={node.color as "violet" | "blue" | "green" | "indigo"}
          >
            {node.type === "ai" ? "AI/ML" : "pipeline"}
          </Badge>
          <Text size="1" color="gray">
            {node.sublabel}
          </Text>
        </Flex>

        <Text size="2" style={{ lineHeight: 1.65, color: "var(--gray-11)" }}>
          {node.description}
        </Text>

        <Flex gap="2" wrap="wrap">
          {node.tech.map((t) => (
            <Badge key={t.name} variant="outline" size="1">
              {t.name}
              {t.version ? ` ${t.version}` : ""}
            </Badge>
          ))}
        </Flex>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Flex direction="column" gap="1">
            <Text
              size="1"
              weight="medium"
              color="gray"
              style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Input
            </Text>
            <Text size="2">{node.dataIn}</Text>
          </Flex>
          <Flex direction="column" gap="1">
            <Text
              size="1"
              weight="medium"
              color="gray"
              style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Output
            </Text>
            <Text size="2">{node.dataOut}</Text>
          </Flex>
        </div>

        <Card
          style={{
            background: `var(--${node.color}-2)`,
            border: `1px solid var(--${node.color}-6)`,
          }}
        >
          <Text
            size="1"
            weight="medium"
            color="gray"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Key Insight
          </Text>
          <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>
            {node.insight}
          </Text>
        </Card>
      </Flex>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StackPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <LayersIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">How It Works</Heading>
      </Flex>

      <Flex align="center" gap="3" mb="6">
        <Text color="gray" size="2">
          The data pipeline that powers nomadically.work — from job discovery to
          your screen. Click any node for details.
        </Text>
        <a
          href="https://github.com/nicolad/nomadically.work"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}
        >
          <GitHubLogoIcon width={16} height={16} />
        </a>
      </Flex>

      <Flex justify="center">
        <PipelineGraph selectedId={selectedId} onSelect={setSelectedId} />
      </Flex>

      {selectedNode && isClickable(selectedNode) && (
        <NodeDetail node={selectedNode} />
      )}
    </Container>
  );
}
