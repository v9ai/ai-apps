"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import "../flow-dark.css";
import {
  Layers,
  Globe,
  Network,
  Database,
  Shield,
  Search,
  Brain,
  Users,
  Mail,
  Server,
  Cpu,
  Zap,
  Filter,
  BarChart3,
  Code as CodeIcon,
  Key,
  AlertTriangle,
  Lock,
  GitBranch,
  Webhook,
  Inbox,
  Send,
  Tag,
  Activity,
  HardDrive,
  Workflow,
  Bot,
} from "lucide-react";
import { Badge, Flex, Heading, Text, Card, Code, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { papers, stats, technicalDetails, extraSections, nodeDetails } from "./data";

// ── Custom Node Components (kept in parity with pipeline/recruitment) ─

function AgentNode({ data }: { data: Record<string, unknown> }) {
  const Icon = data.icon as React.ComponentType<{ size?: number }>;
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 8,
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
            width: 32, height: 32, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `color-mix(in srgb, ${color} 22%, transparent)`,
            color, flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gray-12)", lineHeight: 1.3 }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: "10px", color: "var(--gray-10)", marginTop: 1 }}>{sublabel}</div>
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
        padding: "8px 14px", borderRadius: 6,
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
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-12)" }}>{label}</div>
          {sublabel && <div style={{ fontSize: "9px", color: "var(--gray-10)" }}>{sublabel}</div>}
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
        padding: "5px 12px", borderRadius: 4,
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
      <span style={{ fontSize: "10px", fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  dataStore: DataStoreNode,
  condition: ConditionNode,
};

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 2 },
};

// ── Shared surface styles ────────────────────────────────────────────
// Card elevation applied consistently across MetricsGrid, Technical Details,
// Deep Dive summaries, Foundation papers, and NodeDetailPanel.
const cardSurface = {
  background: "var(--gray-2)",
  border: "1px solid var(--gray-a4)",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.08)",
} as const;

const innerCardSurface = {
  background: "var(--gray-1)",
  border: "1px solid var(--gray-a4)",
  borderRadius: 10,
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
} as const;

// ── Stage 1: frontend ────────────────────────────────────────────────

const s1Nodes: Node[] = [
  { id: "fe-next",   type: "agent", position: { x: 0,   y: 60 }, data: { label: "next.js app router",    sublabel: "Next 16.1 · React 19 · layout.tsx", icon: Globe,       color: "var(--blue-9)" } },
  { id: "fe-radix",  type: "agent", position: { x: 340, y: 0   }, data: { label: "radix themes + panda",   sublabel: "@radix-ui/themes 3.3 · panda 1.9", icon: Layers,      color: "var(--violet-9)" } },
  { id: "fe-apollo", type: "agent", position: { x: 340, y: 120 }, data: { label: "apollo client 3.14",     sublabel: "per-collection cache merges",      icon: Network,     color: "var(--purple-9)" } },
];
const s1Edges: Edge[] = [
  { id: "s1-a", source: "fe-next", target: "fe-radix",  ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "s1-b", source: "fe-next", target: "fe-apollo", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
];

// ── Stage 2: graphql_api ─────────────────────────────────────────────

const s2Nodes: Node[] = [
  { id: "gql-server",      type: "agent",     position: { x: 0,   y: 60  }, data: { label: "apollo server 5.3",  sublabel: "/api/graphql · context per req",    icon: Server,  color: "var(--purple-9)" } },
  { id: "gql-resolvers",   type: "agent",     position: { x: 340, y: 0   }, data: { label: "23 resolver modules", sublabel: "schema-first · domain-bounded",    icon: CodeIcon, color: "var(--violet-9)" } },
  { id: "gql-loaders",     type: "agent",     position: { x: 340, y: 120 }, data: { label: "18 dataloaders",      sublabel: "2 ms batch scheduler",              icon: Zap,     color: "var(--amber-9)" } },
  { id: "gql-admin-guard", type: "condition", position: { x: 680, y: 60  }, data: { label: "isAdminEmail()",     color: "var(--red-9)" } },
];
const s2Edges: Edge[] = [
  { id: "s2-a", source: "gql-server", target: "gql-resolvers", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "s2-b", source: "gql-server", target: "gql-loaders",   ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s2-c", source: "gql-resolvers", target: "gql-admin-guard", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
];

// ── Stage 3: database ────────────────────────────────────────────────

const s3Nodes: Node[] = [
  { id: "db-neon",     type: "agent",     position: { x: 0,   y: 110 }, data: { label: "neon serverless pg",    sublabel: "HTTP driver · RLS + app.tenant",  icon: Database,  color: "var(--cyan-9)" } },
  { id: "db-drizzle",  type: "agent",     position: { x: 340, y: 110 }, data: { label: "drizzle orm",           sublabel: "0.45 · typed schema + migrations", icon: GitBranch, color: "var(--green-9)" } },
  { id: "db-companies", type: "dataStore", position: { x: 680, y: 0   }, data: { label: "companies",   sublabel: "icp_embedding · jsonb signals",       icon: Database, color: "var(--green-9)" } },
  { id: "db-contacts",  type: "dataStore", position: { x: 680, y: 80  }, data: { label: "contacts",    sublabel: "authority · lora_tier · CPN",          icon: Database, color: "var(--green-9)" } },
  { id: "db-emails",    type: "dataStore", position: { x: 680, y: 160 }, data: { label: "contact_emails + received_emails", sublabel: "bidirectional edge", icon: Database, color: "var(--green-9)" } },
];
const s3Edges: Edge[] = [
  { id: "s3-a", source: "db-neon",    target: "db-drizzle",   ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "s3-b", source: "db-drizzle", target: "db-companies", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "s3-c", source: "db-drizzle", target: "db-contacts",  ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "s3-d", source: "db-drizzle", target: "db-emails",    ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
];

// ── Stage 4: auth_security ───────────────────────────────────────────

const s4Nodes: Node[] = [
  { id: "auth-better", type: "agent",     position: { x: 0,   y: 40 }, data: { label: "better auth",        sublabel: "@ai-apps/auth · session cookie",   icon: Lock,            color: "var(--red-9)" } },
  { id: "auth-admin",  type: "condition", position: { x: 340, y: 0  }, data: { label: "isAdminEmail(ctx)",   color: "var(--red-9)" } },
  { id: "auth-gap",    type: "agent",     position: { x: 340, y: 90 }, data: { label: "known gaps",         sublabel: "no CORS · no depth gate",         icon: AlertTriangle,   color: "var(--orange-9)" } },
];
const s4Edges: Edge[] = [
  { id: "s4-a", source: "auth-better", target: "auth-admin", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "s4-b", source: "auth-better", target: "auth-gap",   ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
];

// ── Stage 5: discovery ───────────────────────────────────────────────

const s5Nodes: Node[] = [
  { id: "disc-seeds",   type: "dataStore", position: { x: 0,   y: 40 }, data: { label: "domain seeds",       sublabel: "domains.txt · brave · gh",       icon: HardDrive, color: "var(--teal-9)" } },
  { id: "disc-crawler", type: "agent",     position: { x: 280, y: 40 }, data: { label: "smart crawler",      sublabel: "reqwest · headless chromium",    icon: Search,    color: "var(--orange-9)" } },
  { id: "disc-extract", type: "agent",     position: { x: 560, y: 0  }, data: { label: "ner → vlm → llm",    sublabel: "confidence cascade · qwen fallback", icon: Brain, color: "var(--amber-9)" } },
  { id: "disc-resolve", type: "agent",     position: { x: 560, y: 90 }, data: { label: "entity resolver",    sublabel: "canonical_domain · ai_tier",     icon: Network,   color: "var(--teal-9)" } },
];
const s5Edges: Edge[] = [
  { id: "s5-a", source: "disc-seeds",   target: "disc-crawler", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--teal-8)" } },
  { id: "s5-b", source: "disc-crawler", target: "disc-extract", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "s5-c", source: "disc-extract", target: "disc-resolve", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
];

// ── Stage 6: enrichment_llm ──────────────────────────────────────────

const s6Nodes: Node[] = [
  { id: "enr-graph",    type: "agent", position: { x: 0,   y: 60  }, data: { label: "langgraph enrich",       sublabel: "gather → categorize → price → gtm", icon: Workflow, color: "var(--violet-9)" } },
  { id: "enr-cheap",    type: "agent", position: { x: 340, y: 0   }, data: { label: "deepseek chat",          sublabel: "$0.27 / $1.10 per 1M tok",         icon: Zap,      color: "var(--iris-9)" } },
  { id: "enr-reasoner", type: "agent", position: { x: 340, y: 120 }, data: { label: "deepseek reasoner",      sublabel: "$0.55 / $2.19 · hard nodes only",  icon: Brain,    color: "var(--violet-9)" } },
  { id: "enr-ground",   type: "agent", position: { x: 680, y: 60  }, data: { label: "pydantic + zod",         sublabel: "strategy-enforcer rule 2",          icon: Shield,   color: "var(--amber-9)" } },
];
const s6Edges: Edge[] = [
  { id: "s6-a", source: "enr-graph",    target: "enr-cheap",    ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--iris-8)" } },
  { id: "s6-b", source: "enr-graph",    target: "enr-reasoner", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "s6-c", source: "enr-cheap",    target: "enr-ground",   ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s6-d", source: "enr-reasoner", target: "enr-ground",   ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
];

// ── Stage 7: contacts_ml ─────────────────────────────────────────────

const s7Nodes: Node[] = [
  { id: "cm-discover",  type: "agent",     position: { x: 0,   y: 0   }, data: { label: "email_discover",    sublabel: "pattern gen · page scrape",     icon: Mail,      color: "var(--cyan-9)" } },
  { id: "cm-verify",    type: "agent",     position: { x: 0,   y: 90  }, data: { label: "neverbounce verify", sublabel: "+ local dns/smtp fallback",     icon: Filter,    color: "var(--green-9)" } },
  { id: "cm-authority", type: "agent",     position: { x: 320, y: 0   }, data: { label: "title classifier",   sublabel: "sync · <100 ms · no cloud",     icon: Tag,       color: "var(--indigo-9)" } },
  { id: "cm-engage",    type: "agent",     position: { x: 320, y: 90  }, data: { label: "engagement stumps",  sublabel: "12 features · sub-ms",          icon: BarChart3, color: "var(--amber-9)" } },
  { id: "cm-lora",      type: "agent",     position: { x: 640, y: 0   }, data: { label: "lora persona rank",  sublabel: "mlx train · gated by logreg",   icon: Brain,     color: "var(--amber-9)" } },
  { id: "cm-vector",    type: "dataStore", position: { x: 640, y: 90  }, data: { label: "pgvector hnsw",      sublabel: "bge-m3 · 1024-dim",             icon: Database,  color: "var(--cyan-9)" } },
];
const s7Edges: Edge[] = [
  { id: "s7-a", source: "cm-discover",  target: "cm-verify",    ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "s7-b", source: "cm-verify",    target: "cm-authority", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" } },
  { id: "s7-c", source: "cm-authority", target: "cm-engage",    ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s7-d", source: "cm-engage",    target: "cm-lora",      ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s7-e", source: "cm-lora",      target: "cm-vector",    ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
];

// ── Stage 8: outreach_email ──────────────────────────────────────────

const s8Nodes: Node[] = [
  { id: "out-resend",    type: "agent", position: { x: 0,   y: 0   }, data: { label: "resend send",       sublabel: "In-Reply-To · mustache body",   icon: Send,    color: "var(--cyan-9)" } },
  { id: "out-cpn",       type: "agent", position: { x: 0,   y: 90  }, data: { label: "CPN alias",         sublabel: "{token}@vadim.blog",            icon: Tag,     color: "var(--teal-9)" } },
  { id: "out-webhook",   type: "agent", position: { x: 340, y: 45  }, data: { label: "svix webhook",      sublabel: "inbound + classify",            icon: Webhook, color: "var(--cyan-9)" } },
  { id: "out-langgraph", type: "agent", position: { x: 680, y: 45  }, data: { label: "compose / reply graph", sublabel: "email_compose · email_reply", icon: Workflow, color: "var(--violet-9)" } },
];
const s8Edges: Edge[] = [
  { id: "s8-a", source: "out-resend",  target: "out-webhook",   ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "s8-b", source: "out-cpn",     target: "out-webhook",   ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--teal-8)" } },
  { id: "s8-c", source: "out-webhook", target: "out-langgraph", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
];

// ── Stage 9: langgraph_backend ───────────────────────────────────────

const s9Nodes: Node[] = [
  { id: "lg-runtime",  type: "agent",     position: { x: 0,   y: 90  }, data: { label: "fastapi runtime",     sublabel: "AsyncPostgresSaver · :7860",     icon: Server, color: "var(--violet-9)" } },
  { id: "lg-core",     type: "agent",     position: { x: 340, y: 0   }, data: { label: "5 core graphs",       sublabel: "compose · reply · outreach · admin · sql", icon: Workflow, color: "var(--violet-9)" } },
  { id: "lg-endpoint", type: "agent",     position: { x: 340, y: 90  }, data: { label: "/runs/wait",          sublabel: "sync up to 300 s",               icon: Activity, color: "var(--iris-9)" } },
  { id: "lg-auth",     type: "condition", position: { x: 340, y: 180 }, data: { label: "bearer middleware",   color: "var(--red-9)" } },
  { id: "lg-deploy",   type: "agent",     position: { x: 680, y: 90  }, data: { label: "docker deploy",       sublabel: "cloudflare workers (wrangler)",  icon: Cpu,    color: "var(--violet-9)" } },
];
const s9Edges: Edge[] = [
  { id: "s9-a", source: "lg-runtime",  target: "lg-core",     ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "s9-b", source: "lg-runtime",  target: "lg-endpoint", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--iris-8)" } },
  { id: "s9-c", source: "lg-runtime",  target: "lg-auth",     ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "s9-d", source: "lg-endpoint", target: "lg-deploy",   ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
];

// ── Stage 10: agent_teams ────────────────────────────────────────────

const s10Nodes: Node[] = [
  { id: "at-improve",  type: "agent", position: { x: 0,   y: 0   }, data: { label: "improve-* team",  sublabel: "pipeline · discover · classify · skills",  icon: Bot,           color: "var(--violet-9)" } },
  { id: "at-codefix",  type: "agent", position: { x: 0,   y: 90  }, data: { label: "codefix-* team",  sublabel: "mine → audit → evolve → apply → verify",    icon: CodeIcon,       color: "var(--amber-9)" } },
  { id: "at-pipeline", type: "agent", position: { x: 0,   y: 180 }, data: { label: "pipeline-* team", sublabel: "discover → enrich → contacts → outreach",   icon: Workflow,       color: "var(--green-9)" } },
  { id: "at-research", type: "agent", position: { x: 0,   y: 270 }, data: { label: "research-* team", sublabel: "analyst · hiring · icp · debate protocol",  icon: Users,          color: "var(--blue-9)" } },
  { id: "at-hook",     type: "agent", position: { x: 360, y: 90  }, data: { label: "stop_hook.py",    sublabel: "session score → improvement_queue.json",    icon: Inbox,          color: "var(--red-9)" } },
  { id: "at-strategy", type: "agent", position: { x: 360, y: 180 }, data: { label: "strategy-enforcer", sublabel: "eval-first · grounding-first",             icon: Shield,         color: "var(--amber-9)" } },
];
const s10Edges: Edge[] = [
  { id: "s10-a", source: "at-improve",  target: "at-hook",     ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "s10-b", source: "at-codefix",  target: "at-hook",     ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "s10-c", source: "at-pipeline", target: "at-strategy", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s10-d", source: "at-research", target: "at-strategy", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "s10-e", source: "at-hook",     target: "at-strategy", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
];

// ── Stage Definitions ────────────────────────────────────────────────

const stages = [
  {
    graphName: "frontend",
    description: "Next.js 16 App Router with React 19. Every route is a server component by default; interactivity lives in client islands (*-client.tsx). Apollo Client 3.14 sits in a provider at the layout root with per-collection cache merges that append paginated pages rather than replacing.",
    pattern: "Server shell, client islands",
    nodes: s1Nodes, edges: s1Edges, height: 260,
  },
  {
    graphName: "graphql_api",
    description: "Apollo Server 5.3 at /api/graphql. Schema-first across 16 domain-bounded subdirectories. 23 resolver modules. 18 DataLoaders with a custom 2 ms batch scheduler. Admin writes are gated inline at the top of every mutation by isAdminEmail(context.userEmail).",
    pattern: "Schema-bounded resolvers + batched loaders",
    nodes: s2Nodes, edges: s2Edges, height: 260,
  },
  {
    graphName: "database",
    description: "Neon serverless Postgres via @neondatabase/serverless over HTTP. Drizzle ORM owns every application query — raw SQL is reserved for pgvector operations. Multi-tenant isolation via RLS keyed on a per-request app.tenant GUC. Dual email tables (contact_emails outbound, received_emails inbound) joined through a bidirectional edge.",
    pattern: "Serverless Postgres + typed ORM + RLS",
    nodes: s3Nodes, edges: s3Edges, height: 300,
  },
  {
    graphName: "auth_security",
    description: "Better Auth via @ai-apps/auth populates context.userId + context.userEmail on every GraphQL request. Admin writes check an allow-list in src/lib/admin.ts inline at each mutation. CORS and query-complexity limits are known open gaps — acceptable under the current single-operator threat model, documented in CLAUDE.md.",
    pattern: "Per-mutation admin guard",
    nodes: s4Nodes, edges: s4Edges, height: 220,
  },
  {
    graphName: "discovery",
    description: "Rust crates/leadgen takes a domain seed list and walks each site through a smart crawler whose URL scheduler is reward-loop-boosted by past extraction success. A three-stage NER → VLM → Qwen fallback cascade hits the cheapest extractor first and escalates only on low confidence. Entity resolution writes canonical companies rows with ai_tier.",
    pattern: "Reward-boosted crawl + extraction cascade",
    nodes: s5Nodes, edges: s5Edges, height: 240,
  },
  {
    graphName: "enrichment_llm",
    description: "LangGraph nodes orchestrate enrichment. Cheap-first routing: deepseek-v4-flash for summary nodes, deepseek-v4-pro (thinking mode + reasoning_effort=high) only for value_metric / pricing_design / gtm_pillars. Pydantic (Python) + Zod (TS) bind every LLM output to a schema — strategy-enforcer Rule 2 blocks prompts that don't.",
    pattern: "Cheap-first escalation + pre-commit grounding",
    nodes: s6Nodes, edges: s6Edges, height: 280,
  },
  {
    graphName: "contacts_ml",
    description: "Three-pass local-first scoring: rule-based title classifier (sync, sub-100 ms), decision-stump engagement predictor (12 features, sub-ms), LoRA persona ranker gated by a logreg prefilter so it only fires on authority ≥ 0.5. BGE-M3 embeddings via Candle/Metal land in pgvector with an HNSW cosine index.",
    pattern: "Local-first inference + logreg-gated semantic rank",
    nodes: s7Nodes, edges: s7Edges, height: 260,
  },
  {
    graphName: "outreach_email",
    description: "Outbound via Resend with In-Reply-To threading. Inbound via Svix-signed webhook, routed by a CPN forwarding alias on vadim.blog — one DNS record, one-to-many trackable routing. Composition and reply drafting go through LangGraph's email_compose and email_reply graphs.",
    pattern: "Dual-path: outbound templated send, inbound CPN-routed",
    nodes: s8Nodes, edges: s8Edges, height: 240,
  },
  {
    graphName: "langgraph_backend",
    description: "22 graphs declared in backend/langgraph.json — 5 core (email_compose, email_reply, email_outreach, admin_chat, text_to_sql) plus 17 specialized (deep_icp, icp_team, competitors_team, pricing, gtm, positioning, product_intel, lead_gen_team, contact_enrich variants, classify_paper, deep_scrape, …). Local dev uses `langgraph dev` on :8002 with an in-memory checkpointer. Production runs backend/app.py under a single-worker Uvicorn on :7860, wiring AsyncPostgresSaver (langgraph.checkpoint.postgres.aio) to Neon's pooled URL so thread state survives restarts. The Starlette BearerTokenMiddleware is loaded twice — once via langgraph.json's `http.app` key (custom_app.py, whitelists /ok + /info) and once inline in app.py (whitelists /health + /ok) — so both runtimes share the same Authorization: Bearer contract. Deploy target is Cloudflare Workers Containers via wrangler (Dockerfile: python:3.12-slim + Playwright Chromium, max_instances=1); HuggingFace Spaces was the prior target, abandoned after an auto-abuse flag.",
    pattern: "22 graphs · same code, two runtimes, one auth layer",
    nodes: s9Nodes, edges: s9Edges, height: 320,
  },
  {
    graphName: "agent_teams",
    description: "Four Claude Code skill teams are the control plane — 20 SKILL.md files across .claude/skills/: improve-* (5 skills, /improve — self-improvement toward a remote AI role), codefix-* (6 skills, /codefix — code quality with mine → audit → evolve/apply → verify pipeline and hard caps of 3 edits + 2 evolutions per cycle), pipeline-* (6 skills, /agents pipeline — discover → enrich → contacts + qa → outreach with plan-approval gate), research-* (3 skills, /agents research — competing-hypotheses debate). stop_hook.py scores every session on four dimensions via claude-haiku-4-5 and enqueues sub-threshold runs (CC_IMPROVE_THRESHOLD default 0.65) into ~/.claude/state/improvement_queue.json, which the next /improve cycle drains. strategy-enforcer.ts runs seven rules against staged changes (eval-first, grounding-first, taxonomy, multi-model, spec-driven, observability, HITL). Phase labels emerge from real data and vary per team: BUILDING→OPTIMIZING→APPLYING→INTERVIEWING for improve, IMPROVEMENT→SATURATION→COLLAPSE_RISK for codefix, BUILDING→FLOWING→BOTTLENECK→SATURATED→DEGRADED for pipeline.",
    pattern: "Phase-aware orchestration + emergent alignment",
    nodes: s10Nodes, edges: s10Edges, height: 400,
  },
];

const allNodes = stages.flatMap((s) => s.nodes);

// ── Detail Panel ─────────────────────────────────────────────────────

function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const detail = nodeDetails[nodeId];
  if (!detail) return null;
  const node = allNodes.find((n) => n.id === nodeId);
  const label = (node?.data?.label as string) ?? nodeId;
  const sublabel = node?.data?.sublabel as string | undefined;

  return (
    <Card
      mt="4"
      style={{
        ...cardSurface,
        borderLeft: `3px solid var(--${detail.color}-9)`,
      }}
    >
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4"><Code>{label}</Code></Heading>
          {sublabel && <Text size="1" color="gray">{sublabel}</Text>}
        </Flex>
        <Text size="2" style={{ lineHeight: 1.65, color: "var(--gray-11)" }}>{detail.description}</Text>
        <Flex gap="2" wrap="wrap" style={{ rowGap: 6 }}>
          {detail.tech.map((t) => (
            <Badge key={t.name} variant="outline" size="1">{t.name}{t.version ? ` ${t.version}` : ""}</Badge>
          ))}
        </Flex>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Input</Text>
            <Text size="2">{detail.dataIn}</Text>
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Output</Text>
            <Text size="2">{detail.dataOut}</Text>
          </Flex>
        </div>
        <Card
          style={{
            background: `var(--${detail.color}-2)`,
            border: `1px solid var(--${detail.color}-6)`,
            borderRadius: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Insight</Text>
          <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>{detail.insight}</Text>
        </Card>
      </Flex>
    </Card>
  );
}

// ── Stage Flow ───────────────────────────────────────────────────────

function StageFlow({
  nodes, edges, height, onNodeClick,
}: {
  nodes: Node[]; edges: Edge[]; height: number; onNodeClick: NodeMouseHandler;
}) {
  const [n, , onNodesChange] = useNodesState(nodes);
  const [e, , onEdgesChange] = useEdgesState(edges);

  return (
    <div
      style={{
        width: "100%",
        minHeight: Math.min(height, 520),
        height,
        maxHeight: "70vh",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--gray-a4)",
        background: "color-mix(in srgb, var(--color-background) 95%, var(--gray-3))",
        boxShadow:
          "inset 0 1px 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.18), 0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <ReactFlow
        nodes={n}
        edges={e}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2}
        panOnScroll={false}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={20} size={1} color="var(--gray-a3)" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

// ── Stats Bar ────────────────────────────────────────────────────────

const headerStats = [
  { label: "10 layers", color: "violet" as const },
  { label: "22 langgraph graphs", color: "purple" as const },
  { label: "23 resolvers · 18 loaders", color: "amber" as const },
  { label: "local-first ML", color: "green" as const },
];

function HeaderStats() {
  return (
    <Flex align="center" gap="2" wrap="wrap" mb="5">
      {headerStats.map((stat) => (
        <Badge key={stat.label} color={stat.color} variant="soft" size="2"
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
          {stat.label}
        </Badge>
      ))}
    </Flex>
  );
}

// ── Stage Connector ──────────────────────────────────────────────────

function StageConnector({ fromStage, toStage }: { fromStage: string; toStage: string }) {
  return (
    <Flex align="center" justify="center" direction="column" gap="1" py="1">
      <div style={{ width: 2, height: 16, background: "linear-gradient(to bottom, var(--gray-a5), var(--gray-a7))", borderRadius: 4 }} />
      <Flex
        align="center"
        gap="2"
        style={{
          padding: "3px 10px",
          borderRadius: 4,
          background: "var(--gray-3)",
          border: "1px solid var(--gray-a5)",
          filter: "drop-shadow(0 0 8px var(--violet-a4))",
        }}
      >
        <Zap size={10} style={{ color: "var(--gray-9)" }} />
        <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
          <Code size="1">{fromStage}</Code>
          <span style={{ margin: "0 4px", color: "var(--gray-7)" }}>→</span>
          <Code size="1">{toStage}</Code>
        </Text>
      </Flex>
      <div style={{ width: 2, height: 16, background: "linear-gradient(to bottom, var(--gray-a7), var(--gray-a5))", borderRadius: 4 }} />
    </Flex>
  );
}

const stageConnectors: { fromStage: string; toStage: string }[] = [
  { fromStage: "react_queries", toStage: "graphql_ops" },
  { fromStage: "resolvers", toStage: "drizzle_calls" },
  { fromStage: "rows", toStage: "session_check" },
  { fromStage: "authz_ok", toStage: "crawl_jobs" },
  { fromStage: "crawled_text", toStage: "llm_input" },
  { fromStage: "enriched_company", toStage: "contact_hunt" },
  { fromStage: "verified_contacts", toStage: "outbox" },
  { fromStage: "compose_request", toStage: "graph_run" },
  { fromStage: "graph_runs", toStage: "team_state" },
];

// ── Technical Details ────────────────────────────────────────────────

function TechnicalDetailSection() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <Zap size={16} style={{ color: "var(--amber-9)" }} />
        <Heading size="5">Technical Details</Heading>
      </Flex>
      <Flex direction="column" gap="4">
        {technicalDetails.map((detail) => {
          if (detail.type === "table" && detail.items) {
            return (
              <Card key={detail.heading} style={cardSurface}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Layer</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.label}>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--gray-a3)", fontFamily: "var(--code-font-family, monospace)", color: "var(--green-9)", fontWeight: 500 }}>{item.label}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--gray-a3)", color: "var(--gray-11)" }}>{item.value}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--gray-a3)" }}>
                            {item.metadata && (
                              <Flex gap="1" wrap="wrap">
                                {Object.entries(item.metadata).map(([k, v]) => (
                                  <Badge key={k} variant="outline" size="1"><Code size="1">{String(v)}</Code></Badge>
                                ))}
                              </Flex>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          }

          if (detail.type === "code" && detail.code) {
            return (
              <Card
                key={detail.heading}
                style={{
                  ...cardSurface,
                  borderLeft: "3px solid var(--green-9)",
                }}
              >
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <pre
                  className="arch-code-block"
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 8,
                    background: "var(--gray-1)",
                    border: "1px solid var(--gray-a4)",
                    borderLeft: "3px solid var(--green-a8)",
                    fontSize: 12,
                    fontFamily: "var(--code-font-family, monospace)",
                    color: "var(--gray-12)",
                    overflow: "auto",
                    lineHeight: 1.6,
                  }}
                >{detail.code}</pre>
              </Card>
            );
          }

          if (detail.type === "card-grid" && detail.items) {
            return (
              <Card key={detail.heading} style={cardSurface}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {detail.items.map((item) => (
                    <Card key={item.label} style={innerCardSurface}>
                      <Text size="2" weight="medium" style={{ color: "var(--amber-9)" }}>{item.label}</Text>
                      <Text size="2" color="gray" as="p" mt="1">{item.value}</Text>
                    </Card>
                  ))}
                </div>
              </Card>
            );
          }

          return null;
        })}
      </Flex>
    </div>
  );
}

// ── Deep Dive ────────────────────────────────────────────────────────

const sectionColors = ["violet", "green", "purple", "red", "amber", "blue", "cyan", "teal"] as const;

function DeepDive() {
  return (
    <div className="arch-deepdive">
      <Flex align="center" gap="2" mb="3">
        <Brain size={16} style={{ color: "var(--violet-9)" }} />
        <Heading size="5">Deep Dive</Heading>
      </Flex>
      <Flex direction="column" gap="2">
        {extraSections.map((section, i) => {
          const color = sectionColors[i % sectionColors.length];
          return (
            <details
              key={section.heading}
              className={`sec-${color}`}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <summary
                style={{
                  padding: "10px 16px",
                  background: "var(--gray-2)",
                  borderLeft: `3px solid var(--${color}-9)`,
                  border: "1px solid var(--gray-a4)",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  listStyle: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--gray-12)",
                  fontFamily: "var(--default-font-family, system-ui)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                  background: `color-mix(in srgb, var(--${color}-9) 18%, transparent)`,
                  color: `var(--${color}-9)`, fontSize: 11, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}>{i + 1}</span>
                {section.heading}
                {section.codeBlock && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 500,
                    color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>code</span>
                )}
              </summary>
              <div
                className="arch-deepdive-body"
                style={{
                  padding: "12px 16px 16px",
                  background: "var(--gray-2)",
                  borderLeft: `3px solid var(--${color}-9)`,
                  borderRight: "1px solid var(--gray-a4)",
                  borderBottom: "1px solid var(--gray-a4)",
                  borderRadius: "0 0 12px 12px",
                  marginTop: -1,
                  transition: "border-left-color 180ms ease",
                }}
              >
                <Text size="2" color="gray" as="p" style={{ lineHeight: 1.7, marginBottom: section.codeBlock ? 12 : 0 }}>
                  {section.content}
                </Text>
                {section.codeBlock && (
                  <pre
                    className="arch-code-block"
                    style={{
                      margin: 0,
                      padding: 14,
                      borderRadius: 8,
                      background: "var(--gray-1)",
                      border: "1px solid var(--gray-a4)",
                      borderLeft: "3px solid var(--green-a8)",
                      fontSize: 12,
                      fontFamily: "var(--code-font-family, monospace)",
                      color: "var(--gray-12)",
                      overflow: "auto",
                      lineHeight: 1.6,
                    }}
                  >{section.codeBlock}</pre>
                )}
              </div>
            </details>
          );
        })}
      </Flex>
    </div>
  );
}

// ── Tech Foundations ─────────────────────────────────────────────────

function TechFoundations() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <CodeIcon size={16} style={{ color: "var(--blue-9)" }} />
        <Heading size="5">Technical Foundations</Heading>
      </Flex>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {papers.map((paper) => (
          <Card key={paper.slug} style={cardSurface}>
            <Flex align="center" gap="2" mb="2">
              <Badge variant="soft" size="1" style={{ background: `color-mix(in srgb, ${paper.categoryColor} 20%, transparent)`, color: paper.categoryColor }}>
                {paper.category}
              </Badge>
              <Text size="1" color="gray">{paper.year}</Text>
            </Flex>
            <Heading size="3" mb="1">{paper.title}</Heading>
            <Text size="1" color="gray" mb="2" style={{ display: "block" }}>{paper.authors}</Text>
            <Text size="2" as="p" style={{ lineHeight: 1.6, color: "var(--gray-11)" }}>{paper.finding}</Text>
            <Text size="1" color="gray" as="p" mt="2" style={{ lineHeight: 1.5, fontStyle: "italic" }}>{paper.relevance}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Metrics Grid ─────────────────────────────────────────────────────

function MetricsGrid() {
  return (
    <Card mb="5" style={cardSurface}>
      <Flex align="center" gap="2" mb="3">
        <BarChart3 size={13} style={{ color: "var(--gray-9)" }} />
        <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
          System Metrics
        </Text>
      </Flex>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {stats.map((s) => (
          <Card key={s.label} style={innerCardSurface}>
            <Text size="6" weight="bold" style={{ color: "var(--violet-9)", fontFamily: "var(--code-font-family, monospace)", fontVariantNumeric: "tabular-nums" }}>
              {s.number}
            </Text>
            <Text size="2" as="p" mt="1" style={{ color: "var(--gray-11)", lineHeight: 1.5 }}>{s.label}</Text>
            {s.source && <Text size="1" color="gray" as="p" mt="2" style={{ fontStyle: "italic" }}>{s.source}</Text>}
          </Card>
        ))}
      </div>
    </Card>
  );
}

// ── Navigation Hooks ─────────────────────────────────────────────────

function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const idsKey = ids.join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visibleMap = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleMap.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleMap.delete(entry.target.id);
          }
        }
        if (visibleMap.size > 0) {
          let bestId: string | null = null;
          let bestTop = Number.POSITIVE_INFINITY;
          for (const id of visibleMap.keys()) {
            const el = document.getElementById(id);
            if (!el) continue;
            const top = el.getBoundingClientRect().top;
            if (top >= -120 && top < bestTop) {
              bestTop = top;
              bestId = id;
            }
          }
          if (bestId) setActiveId(bestId);
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.1, 0.5, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}

function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const total = document.body.scrollHeight - window.innerHeight;
        const pct = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
        setProgress(pct);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

function useIsWide(breakpoint = 1024): boolean {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isWide;
}

// ── Navigation Components ────────────────────────────────────────────

type NavItem = { id: string; label: string; kind: "stage" | "section" };

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", `#${id}`);
  }
}

function TopProgressStrip({ progress }: { progress: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 100,
        background: "var(--gray-a3)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: "var(--violet-9)",
          transition: "width 60ms linear",
          boxShadow: "0 0 8px color-mix(in srgb, var(--violet-9) 50%, transparent)",
        }}
      />
    </div>
  );
}

function Breadcrumb() {
  return (
    <Flex align="center" gap="1" mb="2" style={{ fontSize: 12 }}>
      <Link
        href="/how-it-works"
        style={{
          color: "var(--gray-10)",
          textDecoration: "none",
          fontFamily: "var(--code-font-family, monospace)",
        }}
      >
        how it works
      </Link>
      <span style={{ color: "var(--gray-7)" }}>/</span>
      <Text
        size="1"
        style={{
          color: "var(--gray-12)",
          fontFamily: "var(--code-font-family, monospace)",
          fontWeight: 500,
        }}
      >
        architecture
      </Text>
    </Flex>
  );
}

function StageChipsGrid({
  stageItems,
  sectionItems,
  activeId,
}: {
  stageItems: NavItem[];
  sectionItems: NavItem[];
  activeId: string | null;
}) {
  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    scrollToAnchor(id);
  };

  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      <Text
        size="1"
        color="gray"
        mb="2"
        as="p"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        Ten stages
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {stageItems.map((item, i) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => onClick(e, item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${active ? "var(--violet-8)" : "var(--gray-a4)"}`,
                background: active
                  ? "color-mix(in srgb, var(--violet-9) 14%, var(--gray-2))"
                  : "var(--gray-2)",
                textDecoration: "none",
                fontFamily: "var(--code-font-family, monospace)",
                fontSize: 12,
                color: active ? "var(--violet-11)" : "var(--gray-11)",
                minHeight: 38,
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  flexShrink: 0,
                  background: active
                    ? "var(--violet-9)"
                    : "color-mix(in srgb, var(--gray-9) 22%, transparent)",
                  color: active ? "white" : "var(--gray-11)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
      <Text
        size="1"
        color="gray"
        mb="2"
        as="p"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        Further reading
      </Text>
      <Flex gap="2" wrap="wrap">
        {sectionItems.map((item) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => onClick(e, item.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? "var(--amber-8)" : "var(--gray-a5)"}`,
                background: active
                  ? "color-mix(in srgb, var(--amber-9) 16%, var(--gray-2))"
                  : "var(--gray-2)",
                textDecoration: "none",
                fontFamily: "var(--code-font-family, monospace)",
                fontSize: 11,
                color: active ? "var(--amber-11)" : "var(--gray-11)",
                minHeight: 30,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </Flex>
    </div>
  );
}

function SideToc({
  stageItems,
  sectionItems,
  activeId,
}: {
  stageItems: NavItem[];
  sectionItems: NavItem[];
  activeId: string | null;
}) {
  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    scrollToAnchor(id);
  };

  const linkStyle = (active: boolean, kind: "stage" | "section"): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 8px",
    borderRadius: 4,
    borderLeft: `2px solid ${
      active
        ? kind === "stage"
          ? "var(--violet-9)"
          : "var(--amber-9)"
        : "transparent"
    }`,
    background: active ? "var(--gray-a3)" : "transparent",
    textDecoration: "none",
    fontFamily: "var(--code-font-family, monospace)",
    fontSize: 11,
    color: active ? "var(--gray-12)" : "var(--gray-10)",
    lineHeight: 1.4,
    minHeight: 28,
    transition: "background 120ms, color 120ms, border-color 120ms",
  });

  return (
    <nav
      aria-label="On this page"
      style={{
        position: "sticky",
        top: 80,
        alignSelf: "flex-start",
        width: 220,
        flexShrink: 0,
        maxHeight: "calc(100vh - 96px)",
        overflowY: "auto",
        paddingLeft: 12,
        borderLeft: "1px solid var(--gray-a4)",
      }}
    >
      <Text
        size="1"
        color="gray"
        as="p"
        mb="2"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}
      >
        On this page
      </Text>
      <Flex direction="column" gap="1">
        {stageItems.map((item, i) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => onClick(e, item.id)}
              style={linkStyle(active, "stage")}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: active
                    ? "var(--violet-9)"
                    : "color-mix(in srgb, var(--gray-9) 18%, transparent)",
                  color: active ? "white" : "var(--gray-10)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </Flex>
      <div style={{ height: 1, background: "var(--gray-a4)", margin: "10px 4px" }} />
      <Flex direction="column" gap="1">
        {sectionItems.map((item) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => onClick(e, item.id)}
              style={linkStyle(active, "section")}
            >
              <span style={{ color: "var(--amber-9)", fontSize: 10 }}>§</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </Flex>
    </nav>
  );
}

function CompactToc({
  stageItems,
  sectionItems,
  activeId,
}: {
  stageItems: NavItem[];
  sectionItems: NavItem[];
  activeId: string | null;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    scrollToAnchor(id);
    if (detailsRef.current) detailsRef.current.open = false;
  };

  const activeLabel =
    [...stageItems, ...sectionItems].find((it) => it.id === activeId)?.label ?? "overview";

  return (
    <details
      ref={detailsRef}
      style={{
        position: "sticky",
        top: 8,
        zIndex: 20,
        marginBottom: "var(--space-3)",
        borderRadius: 8,
        border: "1px solid var(--gray-a5)",
        background: "color-mix(in srgb, var(--color-background) 92%, var(--gray-3))",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "var(--code-font-family, monospace)",
          fontSize: 12,
          color: "var(--gray-12)",
          minHeight: 40,
        }}
      >
        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
          <Text
            size="1"
            color="gray"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            On this page
          </Text>
          <span
            style={{
              color: "var(--violet-11)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {activeLabel}
          </span>
        </Flex>
        <span style={{ color: "var(--gray-9)" }}>▾</span>
      </summary>
      <div
        style={{
          padding: "4px 10px 10px",
          borderTop: "1px solid var(--gray-a4)",
          maxHeight: 360,
          overflowY: "auto",
        }}
      >
        <Flex direction="column" gap="1" mt="2">
          {stageItems.map((item, i) => {
            const active = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => onClick(e, item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontFamily: "var(--code-font-family, monospace)",
                  fontSize: 12,
                  color: active ? "var(--violet-11)" : "var(--gray-11)",
                  background: active ? "var(--gray-a3)" : "transparent",
                  minHeight: 32,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    flexShrink: 0,
                    background: active
                      ? "var(--violet-9)"
                      : "color-mix(in srgb, var(--gray-9) 18%, transparent)",
                    color: active ? "white" : "var(--gray-10)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                {item.label}
              </a>
            );
          })}
          <div style={{ height: 1, background: "var(--gray-a4)", margin: "6px 0" }} />
          {sectionItems.map((item) => {
            const active = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => onClick(e, item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontFamily: "var(--code-font-family, monospace)",
                  fontSize: 12,
                  color: active ? "var(--amber-11)" : "var(--gray-11)",
                  background: active ? "var(--gray-a3)" : "transparent",
                  minHeight: 32,
                }}
              >
                <span style={{ color: "var(--amber-9)", fontSize: 10 }}>§</span>
                {item.label}
              </a>
            );
          })}
        </Flex>
      </div>
    </details>
  );
}

// ── Root ─────────────────────────────────────────────────────────────

export function ArchitectureClient() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  const stageItems: NavItem[] = stages.map((s) => ({
    id: `stage-${s.graphName}`,
    label: s.graphName,
    kind: "stage",
  }));
  const sectionItems: NavItem[] = [
    { id: "deep-dive", label: "deep dive", kind: "section" },
    { id: "technical", label: "technical details", kind: "section" },
    { id: "foundations", label: "foundations", kind: "section" },
  ];
  const allIds = [...stageItems.map((s) => s.id), ...sectionItems.map((s) => s.id)];

  const activeId = useActiveSection(allIds);
  const progress = useScrollProgress();
  const isWide = useIsWide(1024);

  return (
    <div
      className="arch-root"
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        padding: "var(--space-4) var(--space-4)",
      }}
    >
      <style jsx global>{`
        @media (min-width: 768px) {
          .arch-root {
            padding: var(--space-5) var(--space-6) !important;
          }
        }
        @media (max-width: 900px) {
          .arch-legend {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: var(--space-2) !important;
          }
          .arch-legend-swatches {
            border-left: 0 !important;
            padding-left: 0 !important;
          }
        }
        .arch-stage {
          padding-top: var(--space-5);
          padding-bottom: var(--space-4);
        }
        .arch-back-to-top {
          position: sticky;
          bottom: 16px;
          margin-left: auto;
        }
      `}</style>
      <TopProgressStrip progress={progress} />
      <Breadcrumb />
      <Flex align="center" gap="2" mb="2">
        <Layers width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">System Architecture</Heading>
      </Flex>
      <Text size="3" color="gray" as="p" mb="3" style={{ maxWidth: 780, lineHeight: 1.7 }}>
        Ten architects, ten layers. Each Explore subagent surveyed one layer of the agentic lead-gen stack in
        parallel — from the Next.js App Router shell down to the Claude Code agent teams that manage the system
        itself. Click any node for the 2-sentence brief, the stack, the input/output, and the one non-obvious
        insight that layer gave up.
      </Text>

      <Flex align="center" gap="2" mb="4">
        <Link href="/how-it-works" style={{ textDecoration: "none" }}>
          <Badge variant="soft" color="gray" size="1" style={{ cursor: "pointer" }}>
            ← outreach pipeline
          </Badge>
        </Link>
        <Link href="/how-it-works/recruitment" style={{ textDecoration: "none" }}>
          <Badge variant="soft" color="gray" size="1" style={{ cursor: "pointer" }}>
            ← recruitment pipeline
          </Badge>
        </Link>
      </Flex>

      <StageChipsGrid
        stageItems={stageItems}
        sectionItems={sectionItems}
        activeId={activeId}
      />

      {!isWide && (
        <CompactToc
          stageItems={stageItems}
          sectionItems={sectionItems}
          activeId={activeId}
        />
      )}

      <HeaderStats />
      <MetricsGrid />

      <Flex align="center" gap="4" wrap="wrap" mb="4" py="2" px="3"
        className="arch-legend"
        style={{ borderRadius: 6, background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
        <Flex align="center" gap="2">
          <Badge color="blue" variant="soft" size="1">Interactive</Badge>
          <Text size="1" color="gray">Click nodes for details. Drag to rearrange.</Text>
        </Flex>
        <Flex align="center" gap="3" className="arch-legend-swatches" style={{ borderLeft: "1px solid var(--gray-a5)", paddingLeft: 12 }}>
          <Flex align="center" gap="1">
            <div style={{ width: 18, height: 14, borderRadius: 3, background: "color-mix(in srgb, var(--violet-9) 14%, var(--color-background))", border: "1px solid color-mix(in srgb, var(--violet-9) 45%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={8} style={{ color: "var(--violet-9)" }} />
            </div>
            <Text size="1" color="gray">agent</Text>
          </Flex>
          <Flex align="center" gap="1">
            <div style={{ width: 18, height: 14, borderRadius: 3, background: "color-mix(in srgb, var(--green-9) 10%, var(--color-background))", border: "1px solid color-mix(in srgb, var(--green-9) 35%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={8} style={{ color: "var(--green-9)" }} />
            </div>
            <Text size="1" color="gray">store</Text>
          </Flex>
          <Flex align="center" gap="1">
            <div style={{ width: 18, height: 14, borderRadius: 3, background: "color-mix(in srgb, var(--red-9) 16%, var(--color-background))", border: "1px solid color-mix(in srgb, var(--red-9) 40%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Filter size={8} style={{ color: "var(--red-9)" }} />
            </div>
            <Text size="1" color="gray">gate</Text>
          </Flex>
        </Flex>
      </Flex>

      <div
        style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          alignItems: "flex-start",
          gap: isWide ? 24 : 0,
          width: "100%",
        }}
      >
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
      <section id="pipeline" style={{ scrollMarginTop: 80 }}>
        <Flex direction="column" gap="0">
          {stages.map((stage, i) => (
            <div key={stage.graphName} id={`stage-${stage.graphName}`} className="arch-stage" style={{ scrollMarginTop: 80 }}>
              <div>
                <Flex align="center" gap="3" mb="2" wrap="wrap">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "var(--violet-a3)",
                      color: "var(--violet-11)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 13,
                      flexShrink: 0,
                      fontFamily: "var(--code-font-family, monospace)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <Heading size="4" style={{ fontFamily: "var(--code-font-family, monospace)" }}>
                    {stage.graphName}
                  </Heading>
                  <Badge variant="soft" color="violet" size="1">{stage.pattern}</Badge>
                </Flex>
                <Text
                  size="2"
                  color="gray"
                  mb="3"
                  as="p"
                  style={{
                    padding: "12px 14px",
                    background: "var(--gray-1)",
                    borderLeft: "2px solid var(--gray-a6)",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  {stage.description}
                </Text>
                <StageFlow
                  nodes={stage.nodes}
                  edges={stage.edges}
                  height={stage.height}
                  onNodeClick={onNodeClick}
                />
              </div>
              {i < stageConnectors.length && (
                <StageConnector
                  fromStage={stageConnectors[i].fromStage}
                  toStage={stageConnectors[i].toStage}
                />
              )}
            </div>
          ))}
        </Flex>
      </section>

      {selectedNode && <NodeDetailPanel nodeId={selectedNode} />}

      <Separator size="4" my="7" />
      <section id="deep-dive" style={{ scrollMarginTop: 80 }}>
        <DeepDive />
      </section>

      <Separator size="4" my="7" />
      <section id="technical" style={{ scrollMarginTop: 80 }}>
        <TechnicalDetailSection />
      </section>

      <Separator size="4" my="7" />
      <section id="foundations" style={{ scrollMarginTop: 80 }}>
        <TechFoundations />
      </section>
        </div>

        {isWide && (
          <SideToc
            stageItems={stageItems}
            sectionItems={sectionItems}
            activeId={activeId}
          />
        )}
      </div>

      <Flex justify="end" mt="7" mb="4">
        <a
          href="#pipeline"
          className="arch-back-to-top"
          style={{
            padding: "12px 24px", borderRadius: 6, textDecoration: "none",
            background: "var(--gray-a3)", border: "1px solid var(--gray-a5)",
            color: "var(--gray-11)", fontSize: 13,
            fontFamily: "var(--code-font-family, monospace)",
            display: "inline-flex", alignItems: "center", gap: 8,
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: 14 }}>↑</span> back to top
        </a>
      </Flex>
    </div>
  );
}
