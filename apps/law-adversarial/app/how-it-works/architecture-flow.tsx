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
  Upload,
  Swords,
  Shield,
  Gavel,
  BookOpen,
  Scale,
  Brain,
  Database,
  Radio,
  HardDrive,
  FileText,
  RefreshCw,
  Cpu,
  GitFork,
} from "lucide-react";

/* ─── Custom Node Components ──────────────────────────────────── *
 *
 * React Flow renders every node as a React component. We define
 * four "shapes" here — AgentNode (boxes for AI agents and steps),
 * GroupNode (dashed containers), DataStoreNode (smaller infra boxes),
 * and LoopNode (pill badges like "x3 rounds").
 *
 * <Handle> = the invisible dot where an edge (arrow) attaches.
 *   type="target" = arrow comes IN       type="source" = arrow goes OUT
 *   Position.Top / Bottom / Left / Right = which side the dot sits on
 *
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

/* ─── Node Types Registry ─────────────────────────────────────── *
 * This map tells React Flow which React component to render for
 * each node `type` string. It must be defined OUTSIDE the component
 * (or memoized) — otherwise React Flow creates new instances every
 * render, which breaks drag state and causes flickering.
 * ────────────────────────────────────────────────────────────────── */

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

/* ─── Reusable Mini-Flow Wrapper ──────────────────────────────── *
 *
 * Every sub-diagram uses this same wrapper. It creates a React Flow
 * canvas with a fixed height, dot-grid background, and zoom controls.
 *
 * `fitView` tells React Flow to automatically zoom and pan so that
 * all nodes are visible when the diagram first appears. The
 * `padding` option adds breathing room around the edges.
 *
 * We disable `panOnScroll` so the page scrolls normally — users
 * zoom with pinch or the +/- buttons instead.
 * ────────────────────────────────────────────────────────────────── */

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
 *  1. INGESTION FLOW
 *
 *  What happens when a user uploads a PDF or DOCX file.
 *
 *  The user's file is received as raw bytes by the Upload handler.
 *  parseBrief() detects the file type (PDF → pdf-parse, DOCX →
 *  mammoth) and extracts plain text. That text, along with session
 *  metadata (jurisdiction, config), is written to the Supabase
 *  stress_test_sessions table. From there, the orchestrator picks
 *  it up and starts the debate loop.
 *
 *  This is a simple left-to-right pipeline — no branching, no
 *  parallelism. Each step must finish before the next starts.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ingestionNodes: Node[] = [
  {
    id: "upload",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Upload Brief", sublabel: "PDF or DOCX file", icon: Upload, color: "var(--gray-11)" },
  },
  {
    id: "parse",
    type: "agent",
    position: { x: 260, y: 40 },
    data: { label: "parseBrief()", sublabel: "pdf-parse + mammoth", icon: FileText, color: "var(--orange-9)" },
  },
  {
    id: "supabase",
    type: "dataStore",
    position: { x: 530, y: 45 },
    data: { label: "Supabase PostgreSQL", sublabel: "stress_test_sessions table", icon: Database, color: "var(--amber-9)" },
  },
];

const ingestionEdges: Edge[] = [
  {
    id: "e1", source: "upload", target: "parse",
    ...edgeDefaults, label: "raw bytes",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e2", source: "parse", target: "supabase",
    ...edgeDefaults, label: "plain text + metadata",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
];

export function IngestionFlow() {
  return <MiniFlow nodes={ingestionNodes} edges={ingestionEdges} height={160} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. ADVERSARIAL DEBATE LOOP
 *
 *  The core of the system. Three agents argue about your brief
 *  in structured rounds — like a courtroom trial inside the AI.
 *
 *  Round 1:
 *    Attacker reads the brief and finds every weakness it can.
 *    Defender reads the brief AND the attacks, then rebuts each one
 *      (or concedes if the attack is genuinely valid).
 *    Judge reads both sides and issues a verdict — which attacks
 *      survived, scored by severity (critical/high/medium/low)
 *      and confidence (0.0–1.0).
 *
 *  Round 2:
 *    The Attacker receives previousFindings[] (everything the Judge
 *    decided in Round 1). It's told: "Don't repeat yourself. Go
 *    deeper." It now looks for second-order implications, structural
 *    issues, and subtle inconsistencies it missed the first time.
 *    The same cycle repeats.
 *
 *  Round 3:
 *    Same again, but even deeper. By now, only genuine structural
 *    weaknesses survive — surface issues were already found in
 *    rounds 1-2.
 *
 *  WHY 3 MODELS, NOT 1?
 *  If the same model argues both sides, it has the same blind spots
 *  on both sides (like asking the same person to debate themselves).
 *  Using DeepSeek Reasoner (attack) + Qwen-Plus (defense) + DeepSeek
 *  Chat (judge) means three different training distributions, so
 *  weaknesses one model misses are more likely caught by another.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const debateNodes: Node[] = [
  {
    id: "brief-in",
    type: "dataStore",
    position: { x: 0, y: 80 },
    data: { label: "Brief Text", sublabel: "from Supabase", icon: Database, color: "var(--amber-9)" },
  },
  {
    id: "attacker",
    type: "agent",
    position: { x: 200, y: 0 },
    data: { label: "Attacker", sublabel: "DeepSeek Reasoner — finds weaknesses", icon: Swords, color: "var(--crimson-9)" },
  },
  {
    id: "defender",
    type: "agent",
    position: { x: 200, y: 80 },
    data: { label: "Defender", sublabel: "Qwen-Plus — rebuts or concedes", icon: Shield, color: "var(--blue-9)" },
  },
  {
    id: "judge",
    type: "agent",
    position: { x: 200, y: 160 },
    data: { label: "Judge", sublabel: "DeepSeek Chat / local phi-3.5", icon: Gavel, color: "var(--amber-9)" },
  },
  {
    id: "loop",
    type: "loop",
    position: { x: 470, y: 10 },
    data: { label: "x3 rounds", color: "var(--crimson-9)" },
  },
  {
    id: "findings",
    type: "dataStore",
    position: { x: 460, y: 165 },
    data: { label: "previousFindings[]", sublabel: "accumulates across rounds", icon: Database, color: "var(--green-9)" },
  },
];

const debateEdges: Edge[] = [
  {
    id: "e-in-atk", source: "brief-in", target: "attacker",
    ...edgeDefaults, label: "brief_text",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-atk-def", source: "attacker", target: "defender",
    ...edgeDefaults, label: "attacks JSON",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-def-jdg", source: "defender", target: "judge",
    ...edgeDefaults, label: "rebuttals JSON",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-jdg-findings", source: "judge", target: "findings",
    ...edgeDefaults, label: "verdict",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-findings-loop", source: "findings", target: "loop",
    type: "smoothstep",
    style: { strokeWidth: 1.5, stroke: "var(--green-8)", strokeDasharray: "5 3" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    label: "feeds next round",
  },
  {
    id: "e-loop-atk", source: "loop", target: "attacker",
    type: "smoothstep",
    style: { strokeWidth: 1.5, stroke: "var(--crimson-8)", strokeDasharray: "5 3" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    animated: true,
    label: "go deeper",
  },
];

export function DebateFlow() {
  return <MiniFlow nodes={debateNodes} edges={debateEdges} height={300} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. SPECIALIST AGENTS
 *
 *  After the 3 debate rounds finish, the brief has been torn apart
 *  and defended from every angle. Now three specialist agents run
 *  to handle tasks that don't benefit from debate:
 *
 *  Citation Verifier — checks every legal citation in the brief.
 *    Does the case actually say what the brief claims? Is the
 *    citation format correct? Are there cases cited that don't
 *    exist (hallucinated citations are a real problem)?
 *
 *  Jurisdiction Expert — checks jurisdiction-specific rules.
 *    Different courts have different standards of review, burden
 *    of proof requirements, and procedural rules. This agent
 *    verifies the brief complies with the specified jurisdiction.
 *
 *  These two run IN PARALLEL (Promise.all) because they don't
 *  depend on each other — Citation Verifier doesn't need
 *  jurisdiction info, and vice versa. Running them simultaneously
 *  saves ~15-30 seconds.
 *
 *  Brief Rewriter — runs LAST because it needs the Judge's final
 *  verdict plus citation/jurisdiction findings. It rewrites the
 *  weakest sections of the brief with concrete improvements.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const specialistNodes: Node[] = [
  {
    id: "debate-out",
    type: "dataStore",
    position: { x: 200, y: 0 },
    data: { label: "Final Findings", sublabel: "from 3 debate rounds", icon: Database, color: "var(--crimson-9)" },
  },
  {
    id: "parallel-badge",
    type: "parallel",
    position: { x: 220, y: 70 },
    data: { label: "Promise.all()", color: "var(--purple-9)" },
  },
  {
    id: "citation",
    type: "agent",
    position: { x: 40, y: 120 },
    data: { label: "Citation Verifier", sublabel: "DeepSeek Reasoner", icon: BookOpen, color: "var(--green-9)" },
  },
  {
    id: "jurisdiction",
    type: "agent",
    position: { x: 320, y: 120 },
    data: { label: "Jurisdiction Expert", sublabel: "DeepSeek Reasoner", icon: Scale, color: "var(--purple-9)" },
  },
  {
    id: "rewriter",
    type: "agent",
    position: { x: 180, y: 220 },
    data: { label: "Brief Rewriter", sublabel: "Qwen-Plus — runs last, needs all findings", icon: Brain, color: "var(--orange-9)" },
  },
];

const specialistEdges: Edge[] = [
  {
    id: "e-out-par", source: "debate-out", target: "parallel-badge",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-par-cite", source: "parallel-badge", target: "citation",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-par-juris", source: "parallel-badge", target: "jurisdiction",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },
  {
    id: "e-cite-rw", source: "citation", target: "rewriter",
    ...edgeDefaults, label: "citation results",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-juris-rw", source: "jurisdiction", target: "rewriter",
    ...edgeDefaults, label: "jurisdiction results",
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },
];

export function SpecialistFlow() {
  return <MiniFlow nodes={specialistNodes} edges={specialistEdges} height={340} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. REAL-TIME STREAMING
 *
 *  The analysis takes 90-150 seconds. Users need to see progress
 *  live — not stare at a spinner for two minutes.
 *
 *  The problem: the orchestrator runs in a Vercel serverless
 *  function. Serverless functions can't hold open WebSocket
 *  connections long enough (they timeout at 10-60s). So we use
 *  a polling pattern:
 *
 *  1. The orchestrator writes to the audit_trail table every time
 *     an agent starts, finishes, or produces output.
 *
 *  2. A separate SSE (Server-Sent Events) endpoint polls that
 *     table every 2 seconds.
 *
 *  3. The browser connects via EventSource (a built-in browser
 *     API for one-way server-to-client streaming).
 *
 *  If the user closes their browser mid-analysis, the orchestrator
 *  keeps running and finishes the job. When the user comes back,
 *  the SSE endpoint catches up from the audit_trail table.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const streamingNodes: Node[] = [
  {
    id: "orchestrator",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Orchestrator", sublabel: "Vercel serverless function", icon: Cpu, color: "var(--gray-11)" },
  },
  {
    id: "audit",
    type: "dataStore",
    position: { x: 260, y: 0 },
    data: { label: "audit_trail table", sublabel: "Supabase PostgreSQL", icon: Database, color: "var(--amber-9)" },
  },
  {
    id: "sse",
    type: "agent",
    position: { x: 260, y: 90 },
    data: { label: "SSE Endpoint", sublabel: "polls every 2 seconds", icon: Radio, color: "var(--purple-9)" },
  },
  {
    id: "browser",
    type: "agent",
    position: { x: 530, y: 40 },
    data: { label: "Browser", sublabel: "EventSource API", icon: Cpu, color: "var(--blue-9)" },
  },
];

const streamingEdges: Edge[] = [
  {
    id: "e-orch-audit", source: "orchestrator", target: "audit",
    ...edgeDefaults, label: "writes progress",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-audit-sse", source: "audit", target: "sse",
    ...edgeDefaults, label: "SELECT new rows",
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },
  {
    id: "e-sse-browser", source: "sse", target: "browser",
    ...edgeDefaults, animated: true, label: "stream events",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
];

export function StreamingFlow() {
  return <MiniFlow nodes={streamingNodes} edges={streamingEdges} height={200} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. LOCAL CANDLE SERVER
 *
 *  An optional local inference layer that replaces cloud API calls
 *  with a Rust binary running on your own machine.
 *
 *  Candle is a machine learning framework written in Rust (by
 *  Hugging Face). It compiles to a ~15MB binary that can run AI
 *  models on CPU — no Python, no GPU, no Docker.
 *
 *  It exposes the same /v1/chat/completions and /v1/embeddings
 *  endpoints as OpenAI. This means our DeepSeekClient class
 *  works against it without any code changes — just point the
 *  baseURL to localhost instead of a cloud server.
 *
 *  Two capabilities:
 *
 *  Chat completions — runs phi-3.5-mini (a 3.8B parameter model)
 *  for the Judge agent. The Judge only evaluates two existing
 *  arguments, it doesn't generate new legal analysis, so a
 *  smaller model is sufficient.
 *
 *  Embeddings — converts text into arrays of numbers (vectors)
 *  for semantic search. "The defendant lacked standing" becomes
 *  [0.12, -0.45, 0.78, ...]. Similar sentences produce similar
 *  vectors, enabling "find me cases about X" without keyword
 *  matching. Local embeddings run at ~4,600/sec on M1, vs ~50/sec
 *  through a cloud API.
 *
 *  Toggle: set CANDLE_BASE_URL=http://localhost:9877/v1 in .env.
 *  If not set, everything falls back to cloud APIs as before.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const candleNodes: Node[] = [
  {
    id: "env-check",
    type: "loop",
    position: { x: 0, y: 75 },
    data: { label: "CANDLE_BASE_URL set?", color: "var(--indigo-9)" },
  },
  {
    id: "phi",
    type: "agent",
    position: { x: 220, y: 0 },
    data: { label: "phi-3.5-mini", sublabel: "Chat completions for Judge", icon: HardDrive, color: "var(--indigo-9)" },
  },
  {
    id: "embed",
    type: "agent",
    position: { x: 220, y: 90 },
    data: { label: "Embeddings", sublabel: "embedText() · embedBatch()", icon: HardDrive, color: "var(--indigo-9)" },
  },
  {
    id: "cloud-judge",
    type: "agent",
    position: { x: 500, y: 0 },
    data: { label: "Cloud DeepSeek Chat", sublabel: "fallback when no local", icon: Cpu, color: "var(--gray-9)" },
  },
  {
    id: "judge-out",
    type: "dataStore",
    position: { x: 500, y: 95 },
    data: { label: "JudgeOutput", sublabel: "same Zod schema either way", icon: Database, color: "var(--amber-9)" },
  },
];

const candleEdges: Edge[] = [
  {
    id: "e-env-phi", source: "env-check", target: "phi",
    ...edgeDefaults, animated: true, label: "yes → local",
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-env-embed", source: "env-check", target: "embed",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-env-cloud", source: "env-check", target: "cloud-judge",
    ...edgeDefaults, label: "no → cloud",
    style: { ...edgeDefaults.style, stroke: "var(--gray-7)", strokeDasharray: "5 3" },
  },
  {
    id: "e-phi-out", source: "phi", target: "judge-out",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-cloud-out", source: "cloud-judge", target: "judge-out",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--gray-7)" },
  },
];

export function CandleFlow() {
  return <MiniFlow nodes={candleNodes} edges={candleEdges} height={230} />;
}
