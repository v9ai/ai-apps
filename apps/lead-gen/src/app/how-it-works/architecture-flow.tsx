"use client";

import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
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
  Users,
  Mail,
  Shield,
  Server,
  Cpu,

  RefreshCw,
  GitFork,
  Layers,
  Workflow,
  BarChart3,
} from "lucide-react";

/* ─── Custom Node Components ──────────────────────────────────── *
 *
 * Reused from law-adversarial — dark-mode-optimized with
 * color-mix 14%, boxShadow glow, Radix color tokens.
 * ────────────────────────────────────────────────────────────────── */

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
        minWidth: 170,
        textAlign: "center",
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
        minWidth: 140, textAlign: "center",
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

function LoopNode({ data }: { data: Record<string, unknown> }) {
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
      <RefreshCw size={12} style={{ color }} />
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
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <GitFork size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

/* ─── Node Types Registry ─────────────────────────────────────── */

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  dataStore: DataStoreNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

/* ─── Shared Edge Defaults ────────────────────────────────────── */

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 2 },
};

/* ─── Reusable Mini-Flow Wrapper ──────────────────────────────── */

function MiniFlow({ nodes, edges, height = 280 }: { nodes: Node[]; edges: Edge[]; height?: number }) {
  const [n, , onNodesChange] = useNodesState(nodes);
  const [e, , onEdgesChange] = useEdgesState(edges);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--gray-a4)",
        background: "color-mix(in srgb, var(--color-background) 95%, var(--gray-3))",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)",
      }}
    >
      <ReactFlow
        nodes={n}
        edges={e}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={1.8}
        panOnScroll={false}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={20} size={1} color="var(--gray-a3)" />
        <Controls
          showInteractive={false}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  1. JOB INGESTION FLOW
 *
 *  Rust-based ats-crawler worker scrapes job boards (Ashby,
 *  Greenhouse) via Common Crawl. The insert-jobs worker queues
 *  them for classification. Simple left-to-right pipeline.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ingestionNodes: Node[] = [
  {
    id: "crawler",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "ats-crawler", sublabel: "Rust / Common Crawl", icon: Globe, color: "var(--red-9)" },
  },
  {
    id: "insert",
    type: "agent",
    position: { x: 260, y: 40 },
    data: { label: "insert-jobs", sublabel: "Job ingestion pipeline", icon: Layers, color: "var(--orange-9)" },
  },
  {
    id: "pg-jobs",
    type: "dataStore",
    position: { x: 530, y: 45 },
    data: { label: "PostgreSQL (Neon)", sublabel: "jobs table", icon: Database, color: "var(--green-9)" },
  },
];

const ingestionEdges: Edge[] = [
  {
    id: "e-crawl-insert", source: "crawler", target: "insert",
    ...edgeDefaults, label: "scraped HTML",
    style: { ...edgeDefaults.style, stroke: "var(--red-8)" },
  },
  {
    id: "e-insert-pg", source: "insert", target: "pg-jobs",
    ...edgeDefaults, label: "structured job data",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
];

export function IngestionFlow() {
  return <MiniFlow nodes={ingestionNodes} edges={ingestionEdges} height={160} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. AI CLASSIFICATION FLOW
 *
 *  process-jobs worker (Python/LangGraph) uses DeepSeek to classify
 *  jobs. eu-classifier worker validates EU remote compatibility.
 *  Both run in parallel then merge results into PostgreSQL.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const classificationNodes: Node[] = [
  {
    id: "queue",
    type: "dataStore",
    position: { x: 0, y: 80 },
    data: { label: "Job Queue", sublabel: "unclassified jobs", icon: Database, color: "var(--gray-11)" },
  },
  {
    id: "par-classify",
    type: "parallel",
    position: { x: 180, y: 90 },
    data: { label: "Promise.all()", color: "var(--purple-9)" },
  },
  {
    id: "process-jobs",
    type: "agent",
    position: { x: 320, y: 10 },
    data: { label: "process-jobs", sublabel: "Python / LangGraph + DeepSeek", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "eu-classifier",
    type: "agent",
    position: { x: 320, y: 120 },
    data: { label: "eu-classifier", sublabel: "EU remote validation", icon: Globe, color: "var(--blue-9)" },
  },
  {
    id: "pg-classified",
    type: "dataStore",
    position: { x: 590, y: 70 },
    data: { label: "PostgreSQL (Neon)", sublabel: "classified + EU-tagged", icon: Database, color: "var(--green-9)" },
  },
];

const classificationEdges: Edge[] = [
  {
    id: "e-q-par", source: "queue", target: "par-classify",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-par-proc", source: "par-classify", target: "process-jobs",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-par-eu", source: "par-classify", target: "eu-classifier",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-proc-pg", source: "process-jobs", target: "pg-classified",
    ...edgeDefaults, label: "skills + category",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-eu-pg", source: "eu-classifier", target: "pg-classified",
    ...edgeDefaults, label: "EU compatibility",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
];

export function ClassificationFlow() {
  return <MiniFlow nodes={classificationNodes} edges={classificationEdges} height={260} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. VECTORIZATION & MATCHING FLOW
 *
 *  Resume embeddings enable cosine similarity search
 *  between resume and job vectors for matching.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const matchingNodes: Node[] = [
  {
    id: "resume-upload",
    type: "agent",
    position: { x: 0, y: 0 },
    data: { label: "Resume Upload", sublabel: "PDF / text input", icon: FileText, color: "var(--gray-11)" },
  },
  {
    id: "resume-rag",
    type: "agent",
    position: { x: 240, y: 0 },
    data: { label: "resume-rag", sublabel: "Embedding generation", icon: Cpu, color: "var(--indigo-9)" },
  },
  {
    id: "d1-vectors",
    type: "dataStore",
    position: { x: 240, y: 110 },
    data: { label: "Neon PostgreSQL", sublabel: "1024-dim vectors", icon: Database, color: "var(--green-9)" },
  },
  {
    id: "job-matcher",
    type: "agent",
    position: { x: 490, y: 50 },
    data: { label: "job-matcher", sublabel: "cosine similarity search", icon: Search, color: "var(--green-9)" },
  },
  {
    id: "ranked-jobs",
    type: "dataStore",
    position: { x: 720, y: 55 },
    data: { label: "Ranked Jobs", sublabel: "sorted by relevance", icon: BarChart3, color: "var(--crimson-9)" },
  },
];

const matchingEdges: Edge[] = [
  {
    id: "e-upload-rag", source: "resume-upload", target: "resume-rag",
    ...edgeDefaults, label: "resume text",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-rag-d1", source: "resume-rag", target: "d1-vectors",
    ...edgeDefaults, label: "embed & store",
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-d1-matcher", source: "d1-vectors", target: "job-matcher",
    ...edgeDefaults, label: "resume + job vectors",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-matcher-ranked", source: "job-matcher", target: "ranked-jobs",
    ...edgeDefaults, animated: true, label: "< 100ms",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function MatchingFlow() {
  return <MiniFlow nodes={matchingNodes} edges={matchingEdges} height={220} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. DATABASE ARCHITECTURE FLOW
 *
 *  PostgreSQL (Neon) for all application data via Drizzle ORM.
 *  GraphQL sits in front.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const databaseNodes: Node[] = [
  {
    id: "graphql",
    type: "agent",
    position: { x: 220, y: 0 },
    data: { label: "GraphQL API", sublabel: "typed resolvers + codegen", icon: Workflow, color: "var(--orange-9)" },
  },
  {
    id: "drizzle",
    type: "agent",
    position: { x: 60, y: 100 },
    data: { label: "Drizzle ORM", sublabel: "type-safe schema + migrations", icon: Layers, color: "var(--green-9)" },
  },
  {
    id: "neon-pg",
    type: "dataStore",
    position: { x: 60, y: 210 },
    data: { label: "Neon PostgreSQL", sublabel: "jobs, contacts, campaigns", icon: Database, color: "var(--green-9)" },
  },
];

const databaseEdges: Edge[] = [
  {
    id: "e-gql-drizzle", source: "graphql", target: "drizzle",
    ...edgeDefaults, label: "queries",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-drizzle-neon", source: "drizzle", target: "neon-pg",
    ...edgeDefaults, label: "SQL + RLS",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function DatabaseFlow() {
  return <MiniFlow nodes={databaseNodes} edges={databaseEdges} height={320} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. AUTH & ADMIN FLOW
 *
 *  Better Auth handles sessions. Admin routes are gated by
 *  isAdminEmail(). Campaign management uses AI-drafted emails
 *  sent via Resend.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const adminNodes: Node[] = [
  {
    id: "user",
    type: "agent",
    position: { x: 0, y: 50 },
    data: { label: "User / Admin", sublabel: "email + password", icon: Users, color: "var(--gray-11)" },
  },
  {
    id: "better-auth",
    type: "agent",
    position: { x: 230, y: 0 },
    data: { label: "Better Auth", sublabel: "session-based + Drizzle adapter", icon: Shield, color: "var(--purple-9)" },
  },
  {
    id: "admin-gate",
    type: "loop",
    position: { x: 230, y: 100 },
    data: { label: "isAdminEmail()?", color: "var(--crimson-9)" },
  },
  {
    id: "compose",
    type: "agent",
    position: { x: 460, y: 0 },
    data: { label: "ComposeFromLinkedIn", sublabel: "AI-drafted emails", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "resend",
    type: "dataStore",
    position: { x: 460, y: 110 },
    data: { label: "Resend API", sublabel: "email delivery + events", icon: Mail, color: "var(--blue-9)" },
  },
];

const adminEdges: Edge[] = [
  {
    id: "e-user-auth", source: "user", target: "better-auth",
    ...edgeDefaults, label: "sign in",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-user-gate", source: "user", target: "admin-gate",
    ...edgeDefaults, label: "admin route",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-gate-compose", source: "admin-gate", target: "compose",
    ...edgeDefaults, animated: true, label: "yes",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-compose-resend", source: "compose", target: "resend",
    ...edgeDefaults, label: "send campaign",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
];

export function AdminFlow() {
  return <MiniFlow nodes={adminNodes} edges={adminEdges} height={220} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  6. SYSTEM OVERVIEW FLOW
 *
 *  High-level architecture: Next.js frontend talks to GraphQL,
 *  backed by Neon PostgreSQL and DeepSeek LLM.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const overviewNodes: Node[] = [
  {
    id: "nextjs",
    type: "agent",
    position: { x: 0, y: 60 },
    data: { label: "Next.js 14", sublabel: "App Router + RSC", icon: Server, color: "var(--blue-9)" },
  },
  {
    id: "gql-api",
    type: "agent",
    position: { x: 230, y: 0 },
    data: { label: "GraphQL API", sublabel: "codegen + typed hooks", icon: Workflow, color: "var(--orange-9)" },
  },
  {
    id: "neon-db",
    type: "dataStore",
    position: { x: 480, y: 0 },
    data: { label: "Neon PostgreSQL", sublabel: "all application data", icon: Database, color: "var(--green-9)" },
  },
  {
    id: "deepseek",
    type: "dataStore",
    position: { x: 480, y: 120 },
    data: { label: "DeepSeek LLM", sublabel: "classification + generation", icon: Brain, color: "var(--amber-9)" },
  },
];

const overviewEdges: Edge[] = [
  {
    id: "e-next-gql", source: "nextjs", target: "gql-api",
    ...edgeDefaults, label: "queries + mutations",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-gql-neon", source: "gql-api", target: "neon-db",
    ...edgeDefaults, label: "Drizzle ORM",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-gql-ds", source: "gql-api", target: "deepseek",
    ...edgeDefaults, animated: true, label: "LLM calls",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
];

export function OverviewFlow() {
  return <MiniFlow nodes={overviewNodes} edges={overviewEdges} height={280} />;
}
