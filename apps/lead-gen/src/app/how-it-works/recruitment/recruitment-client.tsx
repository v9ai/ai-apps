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
import "../flow-dark.css";
import {
  Github,
  Search,
  Star,
  GitBranch,
  Users,
  Link as LinkIcon,
  Zap,
  Brain,
  Filter,
  Database,
  BarChart3,
  Code as CodeIcon,
  Activity,
  Tag,
  Layers,
} from "lucide-react";
import { Badge, Flex, Heading, Text, Card, Code, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { papers, stats, technicalDetails, extraSections, nodeDetails } from "./data";

// ── Custom Node Components (copied from pipeline-client.tsx for visual parity) ─

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

// ── Node Types ───────────────────────────────────────────────────────────────

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

// ── Stage 1: Discovery (6 parallel channels) ─────────────────────────────────

const discoveryNodes: Node[] = [
  { id: "gh-bio-search",   type: "agent", position: { x: 0,   y: 0   }, data: { label: "bio_keyword_search",    sublabel: "15 passes A–O · /search/users", icon: Search,    color: "var(--blue-9)" } },
  { id: "gh-stargazers",   type: "agent", position: { x: 0,   y: 90  }, data: { label: "stargazer_mining",       sublabel: "13 AI framework repos",         icon: Star,      color: "var(--amber-9)" } },
  { id: "gh-contributors", type: "agent", position: { x: 0,   y: 180 }, data: { label: "contributor_mining",     sublabel: "12 core AI/ML libs",            icon: GitBranch, color: "var(--green-9)" } },
  { id: "gh-org-members",  type: "agent", position: { x: 0,   y: 270 }, data: { label: "org_public_members",     sublabel: "8 AI labs",                     icon: Users,     color: "var(--purple-9)" } },
  { id: "gh-follower-net", type: "agent", position: { x: 0,   y: 360 }, data: { label: "follower_expansion",     sublabel: "1-hop from top seeds",          icon: Activity,  color: "var(--cyan-9)" } },
  { id: "gh-seed-domain",  type: "agent", position: { x: 0,   y: 450 }, data: { label: "seed_from_companies",    sublabel: "Team pages → github.com/*",     icon: LinkIcon,  color: "var(--teal-9)" } },
  { id: "dedupe-users",    type: "condition", position: { x: 340, y: 225 }, data: { label: "dedupe on user.id",   color: "var(--orange-9)" } },
];

const discoveryEdges: Edge[] = [
  { id: "e-bio-dd",    source: "gh-bio-search",   target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-star-dd",   source: "gh-stargazers",   target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-contr-dd",  source: "gh-contributors", target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "e-org-dd",    source: "gh-org-members",  target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-follow-dd", source: "gh-follower-net", target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-seed-dd",   source: "gh-seed-domain",  target: "dedupe-users", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--teal-8)" } },
];

// ── Stage 2: Hydration ───────────────────────────────────────────────────────

const hydrationNodes: Node[] = [
  { id: "graphql-batch", type: "agent",     position: { x: 0,   y: 40 }, data: { label: "graphql_batch_hydrate", sublabel: "50+ fields per user in 1 query", icon: Layers, color: "var(--purple-9)" } },
];

const hydrationEdges: Edge[] = [];

// ── Stage 3: Signal Extraction ───────────────────────────────────────────────

const extractionNodes: Node[] = [
  { id: "activity-profile", type: "agent", position: { x: 0,   y: 0   }, data: { label: "activity_profile",   sublabel: "30/90/365d · streaks · trend", icon: Activity, color: "var(--cyan-9)" } },
  { id: "ai-topic-detect",  type: "agent", position: { x: 0,   y: 90  }, data: { label: "ai_topic_detect",    sublabel: "16-term AI taxonomy",          icon: Brain,    color: "var(--amber-9)" } },
  { id: "skill-extract",    type: "agent", position: { x: 0,   y: 180 }, data: { label: "skill_extract",      sublabel: "bio · languages · topics",     icon: Tag,      color: "var(--green-9)" } },
  { id: "seniority-infer",  type: "agent", position: { x: 0,   y: 270 }, data: { label: "seniority_infer",    sublabel: "keyword classifier",           icon: BarChart3, color: "var(--indigo-9)" } },
];

const extractionEdges: Edge[] = [];

// ── Stage 4: Scoring ─────────────────────────────────────────────────────────

const scoringNodes: Node[] = [
  { id: "rising-score",   type: "agent",     position: { x: 0,   y: 0   }, data: { label: "rising_score",    sublabel: "9-component composite · emerging-talent prior", icon: Brain,    color: "var(--purple-9)" } },
  { id: "strength-score", type: "agent",     position: { x: 0,   y: 100 }, data: { label: "strength_score",  sublabel: "experience-weighted · senior-hire prior",       icon: Brain,    color: "var(--purple-9)" } },
  { id: "opp-match",      type: "agent",     position: { x: 340, y: 50  }, data: { label: "opp_skill_match", sublabel: "skill overlap % vs. opportunity",               icon: Zap,      color: "var(--violet-9)" } },
  { id: "tier-bucket",    type: "agent",     position: { x: 620, y: 0   }, data: { label: "tier_bucket",     sublabel: "A ≥ 0.70 · B ≥ 0.50 · C < 0.50",                icon: BarChart3, color: "var(--amber-9)" } },
  { id: "score-gate",     type: "condition", position: { x: 620, y: 110 }, data: { label: "score ≥ threshold (OR)", color: "var(--orange-9)" } },
];

const scoringEdges: Edge[] = [
  { id: "e-rs-tb",   source: "rising-score",   target: "tier-bucket",    ...edgeDefaults, label: "rising_score", style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-rs-sg",   source: "rising-score",   target: "score-gate",     ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-ss-sg",   source: "strength-score", target: "score-gate",     ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-rs-opp",  source: "rising-score",   target: "opp-match",      ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-ss-opp",  source: "strength-score", target: "opp-match",      ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
];

// ── Stage 5: Persistence ─────────────────────────────────────────────────────

const persistenceNodes: Node[] = [
  { id: "lancedb-vectors", type: "dataStore", position: { x: 0,   y: 0   }, data: { label: "candidates.lance",  sublabel: "Candle BERT · 384-dim ANN",     icon: Database, color: "var(--cyan-9)" } },
  { id: "neon-contacts",   type: "dataStore", position: { x: 0,   y: 90  }, data: { label: "contacts",          sublabel: "Neon · github_handle unique",   icon: Database, color: "var(--green-9)" } },
  { id: "contact-tags",    type: "agent",     position: { x: 340, y: 45  }, data: { label: "tag_write",         sublabel: "github:* · skill:* · opp:* · src:*", icon: Tag,      color: "var(--green-9)" } },
];

const persistenceEdges: Edge[] = [
  { id: "e-lance-tags", source: "lancedb-vectors", target: "contact-tags", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-neon-tags",  source: "neon-contacts",   target: "contact-tags", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
];

// ── Stage 6: Handoff ─────────────────────────────────────────────────────────

const handoffNodes: Node[] = [
  { id: "contact-pipeline", type: "agent", position: { x: 0, y: 0 }, data: { label: "outreach_pipeline_handoff", sublabel: "Shared contacts schema → /how-it-works", icon: Zap, color: "var(--indigo-9)" } },
];

const handoffEdges: Edge[] = [];

// ── Stage Definitions ────────────────────────────────────────────────────────

const stages = [
  {
    title: "discovery",
    graphName: "discovery",
    description: "Six orthogonal channels fan in to a single dedup gate keyed on numeric user.id. Each channel has a different false-positive profile — the intersection is higher-confidence than any one source.",
    pattern: "Six-channel fan-in",
    nodes: discoveryNodes,
    edges: discoveryEdges,
    height: 560,
  },
  {
    title: "hydration",
    graphName: "hydration",
    description: "A single GraphQL query hydrates 50+ fields per candidate — bio, location, contribution calendar, pinned repos, contributed repos, org memberships — collapsing what would be 10+ REST round-trips into one batch call.",
    pattern: "Batch GraphQL hydration",
    nodes: hydrationNodes,
    edges: hydrationEdges,
    height: 180,
  },
  {
    title: "signal_extraction",
    graphName: "signal_extraction",
    description: "Four deterministic extractors turn the hydrated profile into scoring features: a rolling activity profile, 16-term AI topic detection across pinned + top + contributed repos, multi-source skill tagging, and a keyword-based seniority classifier.",
    pattern: "Deterministic feature extraction",
    nodes: extractionNodes,
    edges: extractionEdges,
    height: 380,
  },
  {
    title: "scoring",
    graphName: "scoring",
    description: "Two independent composite scores with opposite priors — rising_score favors undiscovered talent via an obscurity component; strength_score favors established track records. Opportunity skill match runs in parallel. A disjunctive gate (rising OR strength ≥ threshold) decides persistence.",
    pattern: "Two-prior composite scoring",
    nodes: scoringNodes,
    edges: scoringEdges,
    height: 240,
  },
  {
    title: "persistence",
    graphName: "persistence",
    description: "LanceDB stores vector embeddings for semantic similarity search; Neon stores the canonical contact row with ai_profile jsonb. Every candidate carries a prefix-tagged provenance array (github:* · skill:* · seniority:* · opp:* · src:*) — recruiters see exactly why each candidate surfaced.",
    pattern: "Dual-store with auditable tags",
    nodes: persistenceNodes,
    edges: persistenceEdges,
    height: 220,
  },
  {
    title: "handoff",
    graphName: "handoff",
    description: "GitHub-sourced candidates and LinkedIn-sourced contacts share one contacts table — email discovery, deliverability verification, AI composition, and reply-aware follow-up all apply uniformly. See the root /how-it-works page for the outreach pipeline.",
    pattern: "Shared-schema handoff",
    nodes: handoffNodes,
    edges: handoffEdges,
    height: 140,
  },
];

const allNodes = stages.flatMap((s) => s.nodes);

// ── Detail Panel ─────────────────────────────────────────────────────────────

function NodeDetailPanel({ nodeId }: { nodeId: string }) {
  const detail = nodeDetails[nodeId];
  if (!detail) return null;
  const node = allNodes.find((n) => n.id === nodeId);
  const label = (node?.data?.label as string) ?? nodeId;
  const sublabel = node?.data?.sublabel as string | undefined;

  return (
    <Card mt="4" style={{ borderLeft: `3px solid var(--${detail.color}-9)`, background: "var(--gray-2)" }}>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="4"><Code>{label}</Code></Heading>
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

function EmptyDetailPanel() {
  return (
    <Card mt="4" style={{ border: "1px dashed var(--gray-a6)", background: "var(--gray-2)" }}>
      <Flex align="center" justify="center" direction="column" gap="3" py="5">
        <div style={{
          width: 40, height: 40, borderRadius: 6,
          background: "var(--gray-3)",
          border: "1px solid var(--gray-a5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Search size={18} style={{ color: "var(--gray-9)" }} />
        </div>
        <Flex direction="column" align="center" gap="1">
          <Text size="2" weight="medium">Click any node to inspect</Text>
          <Text size="1" color="gray" style={{ textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            Select a node in any stage diagram to see its description, tech stack, input/output shape, and design insight.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

// ── Stage Flow ───────────────────────────────────────────────────────────────

function StageFlow({
  nodes,
  edges,
  height,
  onNodeClick,
}: {
  nodes: Node[];
  edges: Edge[];
  height: number;
  onNodeClick: NodeMouseHandler;
}) {
  const [n, , onNodesChange] = useNodesState(nodes);
  const [e, , onEdgesChange] = useEdgesState(edges);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 8,
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

// ── Stats Bar ────────────────────────────────────────────────────────────────

const headerStats = [
  { label: "6 discovery channels", color: "blue" as const },
  { label: "50+ fields / candidate", color: "purple" as const },
  { label: "9-component score", color: "amber" as const },
  { label: "0 cloud LLM calls", color: "green" as const },
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

// ── Stage Connector ──────────────────────────────────────────────────────────

function StageConnector({ fromStage, toStage }: { fromStage: string; toStage: string }) {
  return (
    <Flex align="center" justify="center" direction="column" gap="1" py="1">
      <div style={{
        width: 2, height: 16,
        background: "linear-gradient(to bottom, var(--gray-a5), var(--gray-a7))",
        borderRadius: 4,
      }} />
      <Flex align="center" gap="2"
        style={{
          padding: "3px 10px", borderRadius: 4,
          background: "var(--gray-3)", border: "1px solid var(--gray-a5)",
        }}
      >
        <Zap size={10} style={{ color: "var(--gray-9)" }} />
        <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
          <Code size="1">{fromStage}</Code>
          <span style={{ margin: "0 4px", color: "var(--gray-7)" }}>→</span>
          <Code size="1">{toStage}</Code>
        </Text>
      </Flex>
      <div style={{
        width: 2, height: 16,
        background: "linear-gradient(to bottom, var(--gray-a7), var(--gray-a5))",
        borderRadius: 4,
      }} />
    </Flex>
  );
}

const stageConnectors: { fromStage: string; toStage: string }[] = [
  { fromStage: "candidate_logins", toStage: "hydration" },
  { fromStage: "hydrated_profiles", toStage: "signal_extraction" },
  { fromStage: "feature_vectors", toStage: "scoring" },
  { fromStage: "scored_candidates", toStage: "persistence" },
  { fromStage: "contact_rows", toStage: "handoff" },
];

// ── Technical Details Section ────────────────────────────────────────────────

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
              <Card key={detail.heading} style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Field</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</th>
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
              <Card key={detail.heading} style={{ background: "var(--gray-2)", borderLeft: "3px solid var(--green-9)" }}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <pre style={{
                  margin: 0, padding: 14, borderRadius: 6,
                  background: "var(--gray-1)", border: "1px solid var(--green-a4)",
                  fontSize: 12, fontFamily: "var(--code-font-family, monospace)",
                  color: "var(--gray-12)", overflow: "auto", lineHeight: 1.6,
                }}>
                  {detail.code}
                </pre>
              </Card>
            );
          }

          if (detail.type === "card-grid" && detail.items) {
            return (
              <Card key={detail.heading} style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {detail.items.map((item) => (
                    <Card key={item.label} style={{ background: "var(--gray-1)", border: "1px solid var(--gray-a4)" }}>
                      <Text size="2" weight="medium" style={{ color: "var(--amber-9)" }}>{item.label}</Text>
                      <Text size="2" color="gray" as="p" mt="1">{item.value}</Text>
                      {item.metadata && (
                        <Flex gap="1" wrap="wrap" mt="2">
                          {Object.entries(item.metadata).map(([k, v]) => (
                            <Code key={k} size="1" style={{ fontSize: 10 }}>{String(v)}</Code>
                          ))}
                        </Flex>
                      )}
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

// ── Deep Dive ────────────────────────────────────────────────────────────────

const sectionColors = ["violet", "green", "purple", "red", "amber", "blue", "cyan", "teal"] as const;

function DeepDive() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <Brain size={16} style={{ color: "var(--violet-9)" }} />
        <Heading size="5">Deep Dive</Heading>
      </Flex>
      <Flex direction="column" gap="2">
        {extraSections.map((section, i) => {
          const color = sectionColors[i % sectionColors.length];
          return (
            <details key={section.heading} style={{ borderRadius: 8, overflow: "hidden" }}>
              <summary
                style={{
                  padding: "10px 16px",
                  background: "var(--gray-2)",
                  borderLeft: `3px solid var(--${color}-9)`,
                  border: "1px solid var(--gray-a4)",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  listStyle: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--gray-12)",
                  fontFamily: "var(--default-font-family, system-ui)",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                  background: `color-mix(in srgb, var(--${color}-9) 18%, transparent)`,
                  color: `var(--${color}-9)`, fontSize: 11, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {i + 1}
                </span>
                {section.heading}
                {section.codeBlock && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 500,
                    color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    code
                  </span>
                )}
              </summary>
              <div style={{
                padding: "12px 16px 16px",
                background: "var(--gray-2)",
                borderLeft: `3px solid var(--${color}-9)`,
                borderRight: "1px solid var(--gray-a4)",
                borderBottom: "1px solid var(--gray-a4)",
                borderRadius: "0 0 8px 8px",
                marginTop: -1,
              }}>
                <Text size="2" color="gray" as="p" style={{ lineHeight: 1.7, marginBottom: section.codeBlock ? 12 : 0 }}>
                  {section.content}
                </Text>
                {section.codeBlock && (
                  <pre style={{
                    margin: 0, padding: 14, borderRadius: 6,
                    background: "var(--gray-1)", border: "1px solid var(--gray-a4)",
                    fontSize: 12, fontFamily: "var(--code-font-family, monospace)",
                    color: "var(--gray-12)", overflow: "auto", lineHeight: 1.6,
                  }}>
                    {section.codeBlock}
                  </pre>
                )}
              </div>
            </details>
          );
        })}
      </Flex>
    </div>
  );
}

// ── Tech Foundations ─────────────────────────────────────────────────────────

function TechFoundations() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <CodeIcon size={16} style={{ color: "var(--blue-9)" }} />
        <Heading size="5">Technical Foundations</Heading>
      </Flex>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {papers.map((paper) => (
          <Card key={paper.slug} style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
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

// ── Metrics Grid ─────────────────────────────────────────────────────────────

function MetricsGrid() {
  return (
    <Card mb="5" style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
      <Flex align="center" gap="2" mb="3">
        <BarChart3 size={13} style={{ color: "var(--gray-9)" }} />
        <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Pipeline Metrics
        </Text>
      </Flex>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ background: "var(--gray-1)", border: "1px solid var(--gray-a4)" }}>
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

// ── Root ─────────────────────────────────────────────────────────────────────

export function RecruitmentClient() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: "100%", padding: "var(--space-4) var(--space-4)" }}>
      <Flex align="center" gap="2" mb="2">
        <Github width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">Recruitment Pipeline</Heading>
      </Flex>
      <Text size="3" color="gray" as="p" mb="3" style={{ maxWidth: 760, lineHeight: 1.7 }}>
        How we find AI/ML engineers on GitHub. Six orthogonal discovery channels feed a single Rust crate
        (<Code>crates/gh</Code>) that hydrates candidates via GraphQL, extracts features from contribution
        calendars, scores them locally with Candle — never sending profiles to a cloud LLM — and persists the
        result into the same <Code>contacts</Code> table the outreach pipeline uses. Every candidate carries an
        auditable tag array: the recruiter sees exactly which channels surfaced them and why.
      </Text>

      <Flex align="center" gap="2" mb="4">
        <Link href="/how-it-works" style={{ textDecoration: "none" }}>
          <Badge variant="soft" color="gray" size="1" style={{ cursor: "pointer" }}>
            ← company outreach pipeline
          </Badge>
        </Link>
      </Flex>

      <HeaderStats />
      <MetricsGrid />

      <Flex align="center" gap="4" wrap="wrap" mb="4" py="2" px="3"
        style={{ borderRadius: 6, background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
        <Flex align="center" gap="2">
          <Badge color="blue" variant="soft" size="1">Interactive</Badge>
          <Text size="1" color="gray">Click nodes for details. Drag to rearrange.</Text>
        </Flex>
        <Flex align="center" gap="3" style={{ borderLeft: "1px solid var(--gray-a5)", paddingLeft: 12 }}>
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
            <div style={{ width: 18, height: 14, borderRadius: 3, background: "color-mix(in srgb, var(--orange-9) 16%, var(--color-background))", border: "1px solid color-mix(in srgb, var(--orange-9) 40%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Filter size={8} style={{ color: "var(--orange-9)" }} />
            </div>
            <Text size="1" color="gray">gate</Text>
          </Flex>
        </Flex>
      </Flex>

      <section id="pipeline">
        <Flex direction="column" gap="0">
          {stages.map((stage, i) => (
            <div key={stage.title} id={`stage-${stage.graphName}`}>
              <div>
                <Flex align="baseline" gap="3" mb="2">
                  <Badge variant="solid" color="gray" size="1" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {i + 1}
                  </Badge>
                  <Heading size="4" style={{ fontFamily: "var(--code-font-family, monospace)" }}>
                    {stage.graphName}
                  </Heading>
                  <Badge variant="soft" color="violet" size="1">{stage.pattern}</Badge>
                </Flex>
                <Text size="2" color="gray" mb="3" as="p">{stage.description}</Text>
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

      {selectedNode ? <NodeDetailPanel nodeId={selectedNode} /> : <EmptyDetailPanel />}

      <Separator size="4" my="7" />
      <section id="deep-dive">
        <DeepDive />
      </section>

      <Separator size="4" my="7" />
      <section id="technical">
        <TechnicalDetailSection />
      </section>

      <Separator size="4" my="7" />
      <section id="foundations">
        <TechFoundations />
      </section>

      <Flex justify="center" mt="7" mb="4">
        <a
          href="#pipeline"
          style={{
            padding: "8px 20px", borderRadius: 6, textDecoration: "none",
            background: "var(--gray-a3)", border: "1px solid var(--gray-a5)",
            color: "var(--gray-11)", fontSize: 12,
            fontFamily: "var(--code-font-family, monospace)",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>↑</span> back to top
        </a>
      </Flex>
    </div>
  );
}
