"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flow-dark.css";
import {
  Globe,
  Database,
  Brain,
  Search,
  FileText,
  Layers,
  Workflow,
  Zap,
  Filter,
  GitFork,
} from "lucide-react";
import { Badge, Container, Flex, Heading, Text, Card } from "@radix-ui/themes";
import { LayersIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

// ── Custom Node Components ───────────────────────────────────────────────────

function AgentNode({ data }: { data: Record<string, unknown> }) {
  const Icon = data.icon as React.ComponentType<{ size?: number }>;
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        background: `color-mix(in srgb, ${color} 14%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
        boxShadow: `0 0 12px color-mix(in srgb, ${color} 15%, transparent), 0 1px 3px rgba(0,0,0,0.3)`,
        minWidth: 180,
        textAlign: "center" as const,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `color-mix(in srgb, ${color} 22%, transparent)`,
            color, flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)", lineHeight: 1.3 }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: 10, color: "var(--gray-10)", marginTop: 1 }}>{sublabel}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function DataStoreNode({ data }: { data: Record<string, unknown> }) {
  const Icon = data.icon as React.ComponentType<{ size?: number }>;
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        padding: "8px 14px", borderRadius: 8,
        background: `color-mix(in srgb, ${color} 10%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
        boxShadow: `0 0 8px color-mix(in srgb, ${color} 10%, transparent), 0 1px 2px rgba(0,0,0,0.25)`,
        minWidth: 140, textAlign: "center" as const,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ color, flexShrink: 0, display: "flex" }}>
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-12)" }}>{label}</div>
          {sublabel && <div style={{ fontSize: 9, color: "var(--gray-10)" }}>{sublabel}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function ConditionNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const label = data.label as string;
  return (
    <div
      style={{
        padding: "5px 12px", borderRadius: 20,
        background: `color-mix(in srgb, ${color} 16%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Filter size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function ParallelNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const label = data.label as string;
  return (
    <div
      style={{
        padding: "5px 12px", borderRadius: 20,
        background: `color-mix(in srgb, ${color} 16%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <GitFork size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

// ── Node Types ───────────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  dataStore: DataStoreNode,
  condition: ConditionNode,
  parallel: ParallelNode,
};

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 2 },
};

// ── Node Detail Data ─────────────────────────────────────────────────────────

type NodeDetail = {
  description: string;
  tech: { name: string; version?: string }[];
  dataIn: string;
  dataOut: string;
  insight: string;
  color: string;
};

const nodeDetails: Record<string, NodeDetail> = {
  discover: {
    description: "Crawl Common Crawl CDX index to discover Ashby job boards. Greenhouse and Lever boards are registered via API discovery or manual entry.",
    tech: [{ name: "ashby-crawler", version: "Rust" }, { name: "Common Crawl CDX" }, { name: "Neon PostgreSQL" }],
    dataIn: "Common Crawl web archives", dataOut: "Discovered ATS board URLs",
    insight: "Automated board discovery via web archive analysis reduces manual registration to near-zero", color: "red",
  },
  ingest: {
    description: "Pull job listings from ATS platforms (Greenhouse, Lever, Ashby) into Neon PostgreSQL. A unified ingestion layer normalizes data from 3 different API formats into one schema.",
    tech: [{ name: "Greenhouse API" }, { name: "Lever API" }, { name: "Ashby API" }, { name: "Drizzle ORM" }],
    dataIn: "ATS board URLs", dataOut: "Raw job records in Neon",
    insight: "Unified ingestion normalizes 3 different ATS API formats into a single Drizzle schema", color: "orange",
  },
  "neon-jobs": {
    description: "Neon PostgreSQL stores all job data — raw listings, classifications, skill tags, and company info. Accessed via Drizzle ORM with type-safe schema.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }, { name: "@neondatabase/serverless" }],
    dataIn: "Structured job data from ingestion", dataOut: "Queryable job records for all downstream steps",
    insight: "Serverless PostgreSQL with branching — zero cold starts, auto-scaling", color: "green",
  },
  enhance: {
    description: "Fetch full job details — descriptions, requirements, benefits, locations — from ATS APIs for each discovered job. Runs as background tasks with concurrency limits and retry logic.",
    tech: [{ name: "ATS API clients" }, { name: "GraphQL mutations" }],
    dataIn: "Job IDs from ingestion", dataOut: "Enriched records with full descriptions",
    insight: "Batch processing with configurable concurrency and exponential backoff retry", color: "orange",
  },
  "par-classify": {
    description: "Classification and EU validation run in parallel via Promise.all() for throughput. Both write results back to the same job record in PostgreSQL.",
    tech: [{ name: "Promise.all()" }, { name: "Parallel workers" }],
    dataIn: "Unclassified jobs from queue", dataOut: "Parallel classification + EU validation",
    insight: "Parallel execution doubles throughput for the classification bottleneck", color: "purple",
  },
  classify: {
    description: "Use DeepSeek LLM to classify job category, extract skills, and determine seniority. Schema-constrained output with Zod validation ensures structured results.",
    tech: [{ name: "DeepSeek AI", version: "2.0" }, { name: "Vercel AI SDK" }, { name: "Zod" }, { name: "LangGraph" }],
    dataIn: "Job description text", dataOut: "Category + skills + confidence score",
    insight: "Schema-constrained LLM output prevents hallucination; eval-first approach with 80%+ accuracy bar", color: "amber",
  },
  "eu-validate": {
    description: "Validate whether a job is genuinely remote-friendly for EU-based workers. Checks location requirements, visa needs, timezone constraints, and legal entity presence.",
    tech: [{ name: "EU classifier" }, { name: "Rule engine" }, { name: "LLM validation" }],
    dataIn: "Job location + requirements", dataOut: "is_remote_eu boolean + reasoning",
    insight: "Combines rule-based checks with LLM reasoning for higher accuracy than either alone", color: "blue",
  },
  "is-remote-eu": {
    description: "Conditional filter: only jobs classified as genuinely remote-friendly for EU workers proceed to skill extraction and serving. Non-qualifying jobs are stored but not surfaced.",
    tech: [{ name: "Boolean filter" }],
    dataIn: "Classification result", dataOut: "Qualified jobs → next step, others → filtered",
    insight: "This filter is the core value proposition — surfacing only truly EU-remote jobs", color: "crimson",
  },
  extract: {
    description: "Extract technical skills from job descriptions using an LLM pipeline. All extracted skills are validated against a curated taxonomy to prevent drift and ensure consistency.",
    tech: [{ name: "LLM pipeline" }, { name: "Skill taxonomy" }, { name: "Vector operations" }],
    dataIn: "Job description text", dataOut: "Structured skill tags in Neon",
    insight: "Grounding-first: skills validated against curated taxonomy prevents semantic drift", color: "amber",
  },
  "fan-out": {
    description: "After skill extraction, enriched jobs fan out to two parallel consumers: the GraphQL API for serving and the vector store for resume matching.",
    tech: [{ name: "Fan-out pattern" }],
    dataIn: "Enriched + classified + skill-tagged jobs", dataOut: "Parallel paths: serve + match",
    insight: "Decoupled consumers allow serving and matching to scale independently", color: "purple",
  },
  serve: {
    description: "Apollo Server 5 GraphQL API serves classified, skill-tagged jobs to the Next.js frontend. DataLoaders prevent N+1 queries. Typed resolvers from codegen ensure end-to-end type safety.",
    tech: [{ name: "Apollo Server", version: "5" }, { name: "GraphQL" }, { name: "DataLoader" }, { name: "Next.js", version: "16" }, { name: "React", version: "19" }],
    dataIn: "User queries (filters, search, pagination)", dataOut: "Paginated job listings + skill data",
    insight: "DataLoaders batch and cache DB queries; typed resolvers prevent runtime mismatches", color: "blue",
  },
  match: {
    description: "Vector similarity search matches user resumes against job requirements and extracted skills. Semantic matching goes beyond keyword overlap to surface truly relevant positions.",
    tech: [{ name: "resume-rag", version: "Python" }, { name: "Cloudflare Vectorize" }, { name: "Embeddings" }],
    dataIn: "Resume text + job skill vectors", dataOut: "Ranked job matches by similarity",
    insight: "Semantic vector matching finds relevant jobs that keyword search would miss", color: "indigo",
  },
};

// ── Pipeline Graph ───────────────────────────────────────────────────────────

const pipelineNodes: Node[] = [
  { id: "discover", type: "agent", position: { x: 0, y: 0 }, data: { label: "Discover", sublabel: "Common Crawl + ATS APIs", icon: Globe, color: "var(--red-9)" } },
  { id: "ingest", type: "agent", position: { x: 0, y: 120 }, data: { label: "Ingest", sublabel: "Greenhouse / Lever / Ashby", icon: Layers, color: "var(--orange-9)" } },
  { id: "neon-jobs", type: "dataStore", position: { x: 20, y: 240 }, data: { label: "Neon PostgreSQL", sublabel: "jobs + companies", icon: Database, color: "var(--green-9)" } },
  { id: "enhance", type: "agent", position: { x: 0, y: 340 }, data: { label: "Enhance", sublabel: "Full job details from ATS", icon: Zap, color: "var(--orange-9)" } },
  { id: "par-classify", type: "parallel", position: { x: 40, y: 460 }, data: { label: "Promise.all()", color: "var(--purple-9)" } },
  { id: "classify", type: "agent", position: { x: -120, y: 520 }, data: { label: "Classify", sublabel: "DeepSeek + LangGraph", icon: Brain, color: "var(--amber-9)" } },
  { id: "eu-validate", type: "agent", position: { x: 150, y: 520 }, data: { label: "EU Validator", sublabel: "Remote EU compatibility", icon: Globe, color: "var(--blue-9)" } },
  { id: "is-remote-eu", type: "condition", position: { x: 30, y: 650 }, data: { label: "is_remote_eu?", color: "var(--crimson-9)" } },
  { id: "extract", type: "agent", position: { x: 0, y: 740 }, data: { label: "Extract Skills", sublabel: "LLM + taxonomy validation", icon: FileText, color: "var(--amber-9)" } },
  { id: "fan-out", type: "parallel", position: { x: 40, y: 860 }, data: { label: "fan-out", color: "var(--purple-9)" } },
  { id: "serve", type: "agent", position: { x: -120, y: 940 }, data: { label: "GraphQL API", sublabel: "Apollo + Next.js frontend", icon: Workflow, color: "var(--blue-9)" } },
  { id: "match", type: "agent", position: { x: 150, y: 940 }, data: { label: "Resume Match", sublabel: "Vector similarity search", icon: Search, color: "var(--indigo-9)" } },
];

const pipelineEdges: Edge[] = [
  { id: "e-discover-ingest", source: "discover", target: "ingest", ...edgeDefaults, label: "board URLs", style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "e-ingest-neon", source: "ingest", target: "neon-jobs", ...edgeDefaults, label: "raw jobs", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "e-neon-enhance", source: "neon-jobs", target: "enhance", ...edgeDefaults, label: "job IDs", style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "e-enhance-par", source: "enhance", target: "par-classify", ...edgeDefaults, label: "enriched jobs", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "e-par-classify", source: "par-classify", target: "classify", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-par-eu", source: "par-classify", target: "eu-validate", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-classify-filter", source: "classify", target: "is-remote-eu", ...edgeDefaults, label: "skills + category", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-eu-filter", source: "eu-validate", target: "is-remote-eu", ...edgeDefaults, label: "EU compatibility", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-filter-extract", source: "is-remote-eu", target: "extract", ...edgeDefaults, animated: true, label: "qualified jobs", style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" } },
  { id: "e-extract-fan", source: "extract", target: "fan-out", ...edgeDefaults, label: "skill-tagged", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-fan-serve", source: "fan-out", target: "serve", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-fan-match", source: "fan-out", target: "match", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" } },
];

// ── Detail Panel ─────────────────────────────────────────────────────────────

function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const detail = nodeDetails[nodeId];
  if (!detail) return null;
  const node = pipelineNodes.find((n) => n.id === nodeId);
  const label = (node?.data?.label as string) ?? nodeId;
  const sublabel = node?.data?.sublabel as string | undefined;

  return (
    <Card mt="5" style={{ borderLeft: `3px solid var(--${detail.color}-9)`, background: "var(--gray-2)" }}>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4">{label}</Heading>
          {sublabel && <Text size="1" color="gray">{sublabel}</Text>}
        </Flex>
        <Text size="2" style={{ lineHeight: 1.65, color: "var(--gray-11)" }}>{detail.description}</Text>
        <Flex gap="2" wrap="wrap">
          {detail.tech.map((t) => (
            <Badge key={t.name} variant="outline" size="1">{t.name}{t.version ? ` ${t.version}` : ""}</Badge>
          ))}
        </Flex>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Input</Text>
            <Text size="2">{detail.dataIn}</Text>
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Output</Text>
            <Text size="2">{detail.dataOut}</Text>
          </Flex>
        </div>
        <Card style={{ background: `var(--${detail.color}-2)`, border: `1px solid var(--${detail.color}-6)` }}>
          <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Insight</Text>
          <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>{detail.insight}</Text>
        </Card>
      </Flex>
    </Card>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export function PipelineClient() {
  const [nodes, , onNodesChange] = useNodesState(pipelineNodes);
  const [edges, , onEdgesChange] = useEdgesState(pipelineEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <LayersIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">How It Works</Heading>
      </Flex>
      <Flex align="center" gap="3" mb="4">
        <Text color="gray" size="2">
          The data pipeline that powers nomadically.work — from job discovery to your screen.
        </Text>
        <a href="https://github.com/nicolad/nomadically.work" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}>
          <GitHubLogoIcon width={16} height={16} />
        </a>
      </Flex>
      <Flex align="center" gap="2" mb="4">
        <Badge color="blue" variant="soft" size="1">Interactive</Badge>
        <Text size="1" color="gray">Drag nodes to rearrange. Scroll to zoom. Click a node for details.</Text>
      </Flex>
      <div style={{
        width: "100%", height: 700, borderRadius: 12, overflow: "hidden",
        border: "1px solid var(--gray-a4)",
        background: "color-mix(in srgb, var(--color-background) 95%, var(--gray-3))",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)",
      }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick} nodeTypes={nodeTypes}
          colorMode="dark" fitView fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3} maxZoom={2} panOnScroll={false}
          proOptions={{ hideAttribution: false }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background gap={20} size={1} color="var(--gray-a3)" />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
      {selectedNode && <NodeDetailPanel nodeId={selectedNode} />}
    </Container>
  );
}
