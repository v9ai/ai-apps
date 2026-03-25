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
  LogIn,
  Shield,
  Database,
  ListTodo,
  Brain,
  Settings,
  RefreshCw,
  GitFork,
  Cookie,
  Cpu,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

/* ─── Custom Node Components ──────────────────────────────────── *
 *
 * React Flow renders every node as a React component. We define
 * four "shapes" here — AgentNode (boxes for steps), DataStoreNode
 * (smaller infra boxes), LoopNode (pill badges), and ParallelNode.
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
 *  1. AUTHENTICATION FLOW
 *
 *  How users sign up and log in. Better Auth handles credentials,
 *  hashes passwords, creates sessions, and stores everything in
 *  the user, account, and session PostgreSQL tables via Drizzle.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const authNodes: Node[] = [
  {
    id: "signup",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Signup / Login", sublabel: "signUp.email() · signIn.email()", icon: LogIn, color: "var(--blue-9)" },
  },
  {
    id: "better-auth",
    type: "agent",
    position: { x: 280, y: 40 },
    data: { label: "Better Auth", sublabel: "validate + hash password", icon: Shield, color: "var(--purple-9)" },
  },
  {
    id: "session-cookie",
    type: "dataStore",
    position: { x: 540, y: 0 },
    data: { label: "Session Cookie", sublabel: "httpOnly · secure", icon: Cookie, color: "var(--amber-9)" },
  },
  {
    id: "auth-db",
    type: "dataStore",
    position: { x: 540, y: 80 },
    data: { label: "PostgreSQL (Neon)", sublabel: "user · account · session tables", icon: Database, color: "var(--green-9)" },
  },
];

const authEdges: Edge[] = [
  {
    id: "e-signup-auth", source: "signup", target: "better-auth",
    ...edgeDefaults, label: "credentials",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-auth-cookie", source: "better-auth", target: "session-cookie",
    ...edgeDefaults, label: "set cookie",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-auth-db", source: "better-auth", target: "auth-db",
    ...edgeDefaults, label: "store user + session",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function AuthFlow() {
  return <MiniFlow nodes={authNodes} edges={authEdges} height={180} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. TASK DATA FETCHING FLOW
 *
 *  The server component fetches tasks from PostgreSQL using Drizzle
 *  queries filtered by userId and status. Session validation happens
 *  first, then data fetching runs in parallel for tasks + counts.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const fetchNodes: Node[] = [
  {
    id: "server-comp",
    type: "agent",
    position: { x: 0, y: 50 },
    data: { label: "Server Component", sublabel: "app/app/page.tsx", icon: Cpu, color: "var(--gray-11)" },
  },
  {
    id: "session-check",
    type: "agent",
    position: { x: 260, y: 50 },
    data: { label: "Session Check", sublabel: "auth.api.getSession()", icon: Shield, color: "var(--purple-9)" },
  },
  {
    id: "parallel-fetch",
    type: "parallel",
    position: { x: 490, y: 0 },
    data: { label: "parallel queries", color: "var(--green-9)" },
  },
  {
    id: "get-tasks",
    type: "dataStore",
    position: { x: 640, y: -20 },
    data: { label: "getTasksByStatus()", sublabel: "filtered by userId + status", icon: ListTodo, color: "var(--blue-9)" },
  },
  {
    id: "get-counts",
    type: "dataStore",
    position: { x: 640, y: 60 },
    data: { label: "getAllTaskCounts()", sublabel: "inbox · active · completed", icon: Layers, color: "var(--blue-9)" },
  },
  {
    id: "neon-db",
    type: "dataStore",
    position: { x: 890, y: 20 },
    data: { label: "Neon PostgreSQL", sublabel: "tasks table", icon: Database, color: "var(--green-9)" },
  },
];

const fetchEdges: Edge[] = [
  {
    id: "e-sc-sess", source: "server-comp", target: "session-check",
    ...edgeDefaults, label: "headers",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-sess-par", source: "session-check", target: "parallel-fetch",
    ...edgeDefaults, label: "userId",
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },
  {
    id: "e-par-tasks", source: "parallel-fetch", target: "get-tasks",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-par-counts", source: "parallel-fetch", target: "get-counts",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-tasks-db", source: "get-tasks", target: "neon-db",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-counts-db", source: "get-counts", target: "neon-db",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function TaskFetchFlow() {
  return <MiniFlow nodes={fetchNodes} edges={fetchEdges} height={200} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. AI PRIORITY SCORING FLOW
 *
 *  The rule-based AI engine that calculates priorityScore for each
 *  task. Reads weights from userPreferences and computes a weighted
 *  sum of factors like deadlineUrgency and userValue.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const scoringNodes: Node[] = [
  {
    id: "task-input",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Task Created/Updated", sublabel: "server action trigger", icon: ListTodo, color: "var(--blue-9)" },
  },
  {
    id: "prefs",
    type: "dataStore",
    position: { x: 270, y: 0 },
    data: { label: "userPreferences", sublabel: "priorityWeights JSONB", icon: SlidersHorizontal, color: "var(--orange-9)" },
  },
  {
    id: "scoring-engine",
    type: "agent",
    position: { x: 270, y: 80 },
    data: { label: "Scoring Engine", sublabel: "weighted sum algorithm", icon: Brain, color: "var(--crimson-9)" },
  },
  {
    id: "score-out",
    type: "dataStore",
    position: { x: 540, y: 45 },
    data: { label: "tasks.priorityScore", sublabel: "persisted to DB", icon: Database, color: "var(--green-9)" },
  },
];

const scoringEdges: Edge[] = [
  {
    id: "e-task-engine", source: "task-input", target: "scoring-engine",
    ...edgeDefaults, label: "task data",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-prefs-engine", source: "prefs", target: "scoring-engine",
    ...edgeDefaults, label: "weights",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-engine-out", source: "scoring-engine", target: "score-out",
    ...edgeDefaults, animated: true, label: "priorityScore",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
];

export function ScoringFlow() {
  return <MiniFlow nodes={scoringNodes} edges={scoringEdges} height={200} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. TASK MANAGEMENT UI FLOW
 *
 *  How the dashboard renders tasks. StatusTabs controls navigation,
 *  TaskList renders the paginated list, and forms validated by Zod
 *  trigger server actions to mutate the tasks table.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const uiNodes: Node[] = [
  {
    id: "status-tabs",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "StatusTabs", sublabel: "inbox · active · completed", icon: Layers, color: "var(--blue-9)" },
  },
  {
    id: "task-list",
    type: "agent",
    position: { x: 260, y: 0 },
    data: { label: "TaskList", sublabel: "paginated by chunkSize", icon: ListTodo, color: "var(--blue-9)" },
  },
  {
    id: "zod-validate",
    type: "loop",
    position: { x: 260, y: 90 },
    data: { label: "Zod validate", color: "var(--orange-9)" },
  },
  {
    id: "server-action",
    type: "agent",
    position: { x: 450, y: 40 },
    data: { label: "Server Action", sublabel: "create · update · delete", icon: Cpu, color: "var(--gray-11)" },
  },
  {
    id: "tasks-table",
    type: "dataStore",
    position: { x: 660, y: 45 },
    data: { label: "tasks table", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" },
  },
];

const uiEdges: Edge[] = [
  {
    id: "e-tabs-list", source: "status-tabs", target: "task-list",
    ...edgeDefaults, label: "?status=active",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-tabs-zod", source: "status-tabs", target: "zod-validate",
    ...edgeDefaults, label: "edit form",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-zod-action", source: "zod-validate", target: "server-action",
    ...edgeDefaults, label: "validated data",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-action-db", source: "server-action", target: "tasks-table",
    ...edgeDefaults, animated: true, label: "Drizzle ORM",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function TaskUIFlow() {
  return <MiniFlow nodes={uiNodes} edges={uiEdges} height={200} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. USER PREFERENCES SYNC FLOW
 *
 *  SettingsModal lets users configure chronotype, chunkSize, and
 *  priorityWeights. Changes are validated and persisted via server
 *  actions, affecting both display and AI scoring in real-time.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const prefsNodes: Node[] = [
  {
    id: "settings-modal",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "SettingsModal", sublabel: "chronotype · chunkSize · weights", icon: Settings, color: "var(--amber-9)" },
  },
  {
    id: "prefs-action",
    type: "agent",
    position: { x: 290, y: 40 },
    data: { label: "Server Action", sublabel: "validate + persist", icon: Cpu, color: "var(--gray-11)" },
  },
  {
    id: "prefs-table",
    type: "dataStore",
    position: { x: 540, y: 0 },
    data: { label: "userPreferences", sublabel: "JSONB priorityWeights", icon: Database, color: "var(--green-9)" },
  },
  {
    id: "recalc",
    type: "loop",
    position: { x: 540, y: 90 },
    data: { label: "recalculate scores", color: "var(--crimson-9)" },
  },
];

const prefsEdges: Edge[] = [
  {
    id: "e-modal-action", source: "settings-modal", target: "prefs-action",
    ...edgeDefaults, label: "new settings",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-action-prefs", source: "prefs-action", target: "prefs-table",
    ...edgeDefaults, label: "Drizzle update",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-prefs-recalc", source: "prefs-table", target: "recalc",
    ...edgeDefaults, animated: true, label: "triggers re-score",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
];

export function PreferencesFlow() {
  return <MiniFlow nodes={prefsNodes} edges={prefsEdges} height={190} />;
}
