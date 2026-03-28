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
  Users,
  Mail,
  Shield,
  Filter,
  GitFork,
  Zap,
  BarChart3,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { Badge, Flex, Heading, Text, Card, Code } from "@radix-ui/themes";
import { LayersIcon } from "@radix-ui/react-icons";

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
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
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
  // Stage 1: Company Discovery
  "ccrawl": {
    description: "Query the Common Crawl CDX index to find company websites matching target industry patterns. Filters by domain structure and known B2B signals before fetching content.",
    tech: [{ name: "Common Crawl CDX" }, { name: "scripts/" }],
    dataIn: "CDX index queries", dataOut: "Company domain URLs",
    insight: "Common Crawl lets you discover companies at scale without hitting rate limits — terabytes of pre-crawled web data, free", color: "red",
  },
  "live-fetch": {
    description: "Live website fetching and web search for company discovery. Supplements Common Crawl with real-time signals for recently founded companies not yet in the archive.",
    tech: [{ name: "HTTP fetch" }, { name: "Web search" }],
    dataIn: "Search queries / seed domains", dataOut: "Company metadata",
    insight: "Combining archive (Common Crawl) and live (web search) sources maximizes coverage across company ages", color: "blue",
  },
  "bulk-csv": {
    description: "Bulk CSV import via the /api/companies/bulk-import route. Accepts CSV exports from LinkedIn Sales Navigator, Apollo, or manual lists, normalizing fields to the companies schema.",
    tech: [{ name: "/api/companies/bulk-import" }, { name: "Drizzle ORM" }],
    dataIn: "CSV file with company rows", dataOut: "Normalized company records",
    insight: "CSV import is the fastest path to seeding the DB from existing prospect lists — no crawling required", color: "violet",
  },
  "dedup-companies": {
    description: "Domain and slug-based deduplication before writing to Neon. Uses URL normalization (strip www, trailing slash) and exact domain matching to prevent duplicate company records.",
    tech: [{ name: "URL normalization" }, { name: "Neon PostgreSQL upsert" }],
    dataIn: "Raw company URLs", dataOut: "Net-new companies only",
    insight: "Deduplication at the slug/domain level keeps the companies table clean across all three discovery sources", color: "orange",
  },
  "neon-companies": {
    description: "Persist new companies to the Neon PostgreSQL companies table via Drizzle ORM. Each row gets a unique slug, domain, name, and discovery metadata for downstream enrichment.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Deduplicated company records", dataOut: "Persisted company rows",
    insight: "Companies table is the single source of truth — all enrichment, contacts, and outreach link back here by company ID", color: "green",
  },
  // Stage 2: Enrichment
  "fetch-site": {
    description: "Fetch live website content for each unenriched company. Extracts homepage HTML, meta tags, About pages, and pricing pages as raw signals for downstream LLM extraction.",
    tech: [{ name: "HTTP fetch" }, { name: "/api/companies/enhance" }],
    dataIn: "Company domain", dataOut: "Raw website content",
    insight: "Live fetch captures the current state of the company — crucial for fast-moving AI startups whose positioning changes frequently", color: "blue",
  },
  "extract-signals": {
    description: "LLM-assisted extraction of services, industry category, tech stack mentions, and business model signals from raw website content. Output is structured JSON for DB persistence.",
    tech: [{ name: "DeepSeek LLM" }, { name: "Zod schema" }],
    dataIn: "Website content", dataOut: "Structured company signals",
    insight: "Grounding-first: LLM output is schema-constrained via Zod — prevents hallucinated fields from entering the DB", color: "amber",
  },
  "ai-classify": {
    description: "DeepSeek classifies each company into an AI tier: not-AI, AI-first, or AI-native. Returns a confidence score and classification rationale for audit trails.",
    tech: [{ name: "DeepSeek LLM" }, { name: "AI tier taxonomy" }],
    dataIn: "Company signals + description", dataOut: "AI tier + confidence score",
    insight: "Fixed 3-tier taxonomy prevents category drift — same labels across all enrichment runs enable reliable filtering", color: "purple",
  },
  "deep-analysis": {
    description: "DeepSeek generates a structured deep analysis: technical maturity signals, product focus, competitive positioning, hiring patterns, and outreach talking points.",
    tech: [{ name: "DeepSeek LLM" }, { name: "LangSmith tracing" }],
    dataIn: "Company context + AI tier", dataOut: "Deep analysis text",
    insight: "Deep analysis is pre-computed once and served fast — avoids per-contact LLM latency in the outreach flow", color: "purple",
  },
  "neon-enriched": {
    description: "Write enriched fields back to the companies table: category, AI tier, confidence, services, tech stack, and deep analysis. Marks company as enriched to skip on next run.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Enrichment payload", dataOut: "Updated company row",
    insight: "Idempotent upsert with enriched_at timestamp lets you re-enrich companies on demand without creating duplicates", color: "green",
  },
  // Stage 4: Contact Pipeline
  "linkedin-source": {
    description: "LinkedIn profile data as the primary input for contact records. Profile URL, current position, and company association are extracted and linked to the company row.",
    tech: [{ name: "LinkedIn data" }, { name: "GraphQL mutation" }],
    dataIn: "LinkedIn profile URL", dataOut: "Contact record draft",
    insight: "LinkedIn URL is the canonical identifier for contacts — used as the dedup key across all contact operations", color: "blue",
  },
  "email-discover": {
    description: "Email pattern discovery using company domain + name patterns (first.last@, f.last@, first@). Generates candidate emails ranked by pattern prevalence at the target company.",
    tech: [{ name: "Email pattern engine" }, { name: "Domain SMTP probe" }],
    dataIn: "Contact name + company domain", dataOut: "Candidate email list",
    insight: "Pattern-based discovery generates 2–5 candidates per contact; NeverBounce then filters to the verified address", color: "amber",
  },
  "neverbounce": {
    description: "NeverBounce API verifies email deliverability for each candidate address. Marks emails as valid, invalid, catch-all, or unknown. Invalid emails are stored but flagged, not discarded.",
    tech: [{ name: "NeverBounce API" }, { name: "contact_emails table" }],
    dataIn: "Candidate email list", dataOut: "Verified emails with status",
    insight: "Storing invalid emails prevents re-verifying the same address and tracks bounce history for deliverability health monitoring", color: "green",
  },
  "neon-contacts": {
    description: "Persist verified contacts to the contacts table and associated emails to contact_emails. Links contacts to their company via foreign key for joined queries in the GraphQL API.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Contact + verified emails", dataOut: "Persisted contact rows",
    insight: "Splitting contacts and contact_emails into separate tables supports multiple emails per contact and bounce tracking per address", color: "green",
  },
  // Stage 5: Outreach Pipeline
  "compose-linkedin": {
    description: "ComposeFromLinkedIn generates personalized email drafts: parallel research on contact + company context feeds DeepSeek to draft, then a second pass refines tone and removes AI artifacts.",
    tech: [{ name: "DeepSeek LLM" }, { name: "ComposeFromLinkedIn component" }],
    dataIn: "Contact LinkedIn URL + company context", dataOut: "Subject + text + HTML email draft",
    insight: "Two-pass generation (draft + refine) catches AI-sounding phrases that a single pass would miss — crucial for deliverability", color: "purple",
  },
  "batch-campaign": {
    description: "Batch email campaign creation with configurable sequences, delays, and follow-up intervals. Groups contacts by company or segment for coordinated outreach.",
    tech: [{ name: "email_campaigns table" }, { name: "GraphQL mutation" }],
    dataIn: "Contact IDs + campaign config", dataOut: "Campaign records",
    insight: "Configurable sequences let you time follow-ups based on no-reply windows without hardcoding delays", color: "amber",
  },
  "resend-deliver": {
    description: "Resend API delivers emails with reply-to tracking. Each send is recorded in Neon with message ID for webhook correlation. Batch sends respect Resend rate limits.",
    tech: [{ name: "Resend API" }, { name: "email_campaigns table" }],
    dataIn: "Campaign email records", dataOut: "Delivered message IDs",
    insight: "Storing the Resend message ID per send enables exact correlation between delivery events and webhook callbacks", color: "amber",
  },
  "webhook-inbound": {
    description: "Resend webhooks capture inbound replies and delivery events. Each event is parsed and stored in the received_emails table, updating contact status and pausing follow-up sequences on reply.",
    tech: [{ name: "Resend webhooks" }, { name: "received_emails table" }],
    dataIn: "Resend webhook payload", dataOut: "Received email records",
    insight: "Webhook-driven reply detection pauses follow-up sequences immediately — prevents sending follow-ups after a positive reply", color: "blue",
  },
  "followup-schedule": {
    description: "Automatic follow-up scheduling based on campaign configuration and reply status. Computes next send time, skips contacts who replied or are marked do-not-contact.",
    tech: [{ name: "Campaign config" }, { name: "Drizzle ORM" }],
    dataIn: "Send history + reply status", dataOut: "Scheduled follow-up sends",
    insight: "Reply-aware scheduling prevents the classic outreach mistake of following up on a thread that already converted", color: "indigo",
  },
};

// ── Stage 1: Company Discovery ───────────────────────────────────────────────

const discoveryNodes: Node[] = [
  { id: "ccrawl", type: "agent", position: { x: 0, y: 0 }, data: { label: "common_crawl", sublabel: "CDX index query", icon: Globe, color: "var(--red-9)" } },
  { id: "live-fetch", type: "agent", position: { x: 0, y: 90 }, data: { label: "live_fetch", sublabel: "Web search + HTTP", icon: Search, color: "var(--blue-9)" } },
  { id: "bulk-csv", type: "agent", position: { x: 0, y: 180 }, data: { label: "bulk_csv_import", sublabel: "/api/companies/bulk-import", icon: FileText, color: "var(--violet-9)" } },
  { id: "dedup-companies", type: "condition", position: { x: 320, y: 85 }, data: { label: "dedup (domain/slug)", color: "var(--orange-9)" } },
  { id: "neon-companies", type: "dataStore", position: { x: 560, y: 90 }, data: { label: "companies", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const discoveryEdges: Edge[] = [
  { id: "e-cc-dedup", source: "ccrawl", target: "dedup-companies", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "e-lf-dedup", source: "live-fetch", target: "dedup-companies", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-csv-dedup", source: "bulk-csv", target: "dedup-companies", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "e-dedup-neon", source: "dedup-companies", target: "neon-companies", ...edgeDefaults, label: "net-new", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
];

// ── Stage 2: Enrichment ──────────────────────────────────────────────────────

const enrichmentNodes: Node[] = [
  { id: "fetch-site", type: "agent", position: { x: 0, y: 40 }, data: { label: "fetch_website", sublabel: "Live HTML extraction", icon: Globe, color: "var(--blue-9)" } },
  { id: "extract-signals", type: "agent", position: { x: 270, y: 40 }, data: { label: "extract_signals", sublabel: "Services / tech / industry", icon: Zap, color: "var(--amber-9)" } },
  { id: "ai-classify", type: "agent", position: { x: 530, y: 0 }, data: { label: "ai_tier_classify", sublabel: "DeepSeek — not-AI / AI-first / AI-native", icon: Brain, color: "var(--purple-9)" } },
  { id: "deep-analysis", type: "agent", position: { x: 530, y: 90 }, data: { label: "deep_analysis", sublabel: "DeepSeek structured report", icon: Brain, color: "var(--purple-9)" } },
  { id: "neon-enriched", type: "dataStore", position: { x: 810, y: 45 }, data: { label: "companies (enriched)", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const enrichmentEdges: Edge[] = [
  { id: "e-fs-ex", source: "fetch-site", target: "extract-signals", ...edgeDefaults, label: "raw HTML", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-ex-cls", source: "extract-signals", target: "ai-classify", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-ex-da", source: "extract-signals", target: "deep-analysis", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-cls-neon", source: "ai-classify", target: "neon-enriched", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-da-neon", source: "deep-analysis", target: "neon-enriched", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
];

// ── Stage 4: Contact Pipeline ────────────────────────────────────────────────

const contactNodes: Node[] = [
  { id: "linkedin-source", type: "agent", position: { x: 0, y: 0 }, data: { label: "linkedin_profile", sublabel: "Profile URL + position", icon: Users, color: "var(--blue-9)" } },
  { id: "email-discover", type: "agent", position: { x: 0, y: 100 }, data: { label: "email_discovery", sublabel: "Domain pattern generation", icon: Mail, color: "var(--amber-9)" } },
  { id: "neverbounce", type: "agent", position: { x: 310, y: 50 }, data: { label: "neverbounce_verify", sublabel: "Deliverability check", icon: Shield, color: "var(--green-9)" } },
  { id: "neon-contacts", type: "dataStore", position: { x: 570, y: 55 }, data: { label: "contacts + contact_emails", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const contactEdges: Edge[] = [
  { id: "e-li-nb", source: "linkedin-source", target: "neverbounce", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-ed-nb", source: "email-discover", target: "neverbounce", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-nb-neon", source: "neverbounce", target: "neon-contacts", ...edgeDefaults, label: "verified", style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
];

// ── Stage 5: Outreach Pipeline ───────────────────────────────────────────────

const outreachNodes: Node[] = [
  { id: "compose-linkedin", type: "agent", position: { x: 0, y: 50 }, data: { label: "compose_from_linkedin", sublabel: "Parallel research → draft → refine", icon: Brain, color: "var(--purple-9)" } },
  { id: "batch-campaign", type: "agent", position: { x: 290, y: 0 }, data: { label: "batch_campaign", sublabel: "Sequences + delays", icon: Mail, color: "var(--amber-9)" } },
  { id: "resend-deliver", type: "agent", position: { x: 290, y: 100 }, data: { label: "resend_deliver", sublabel: "Resend API", icon: Zap, color: "var(--amber-9)" } },
  { id: "webhook-inbound", type: "dataStore", position: { x: 560, y: 0 }, data: { label: "received_emails", sublabel: "Resend webhooks → Neon", icon: Webhook, color: "var(--blue-9)" } },
  { id: "followup-schedule", type: "agent", position: { x: 560, y: 100 }, data: { label: "followup_schedule", sublabel: "Reply-aware scheduling", icon: RefreshCw, color: "var(--indigo-9)" } },
];

const outreachEdges: Edge[] = [
  { id: "e-cl-bc", source: "compose-linkedin", target: "batch-campaign", ...edgeDefaults, label: "AI draft", style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-cl-rd", source: "compose-linkedin", target: "resend-deliver", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-bc-wi", source: "batch-campaign", target: "webhook-inbound", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-rd-fs", source: "resend-deliver", target: "followup-schedule", ...edgeDefaults, label: "message IDs", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-wi-fs", source: "webhook-inbound", target: "followup-schedule", ...edgeDefaults, label: "reply events", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
];

// ── Stage Definitions ────────────────────────────────────────────────────────

const stages = [
  {
    title: "company_discovery",
    graphName: "company_discovery",
    description: "Three source types — Common Crawl CDX, live web search, and bulk CSV import — fan-in through a domain/slug dedup gate before persisting to Neon.",
    pattern: "Multi-source fan-in",
    nodes: discoveryNodes,
    edges: discoveryEdges,
    height: 280,
  },
  {
    title: "enrichment",
    graphName: "enrichment",
    description: "Live website fetch → signal extraction → parallel DeepSeek calls for AI tier classification and deep analysis → write enriched fields back to companies table.",
    pattern: "LLM-assisted classification",
    nodes: enrichmentNodes,
    edges: enrichmentEdges,
    height: 200,
  },
  {
    title: "contact_pipeline",
    graphName: "contact_pipeline",
    description: "LinkedIn profile data and email pattern discovery fan-in to NeverBounce verification, then persist to contacts + contact_emails tables with deliverability status.",
    pattern: "Parallel discovery + verification",
    nodes: contactNodes,
    edges: contactEdges,
    height: 200,
  },
  {
    title: "outreach_pipeline",
    graphName: "outreach_pipeline",
    description: "ComposeFromLinkedIn generates AI-personalized drafts (two-pass: draft + refine), campaigns batch via Resend, inbound replies land via webhook, follow-ups are reply-aware.",
    pattern: "AI-personalized campaigns",
    nodes: outreachNodes,
    edges: outreachEdges,
    height: 220,
  },
];

// ── All nodes (for detail lookup) ────────────────────────────────────────────

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

// ── Stage Flow Component ─────────────────────────────────────────────────────

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

// ── Export ────────────────────────────────────────────────────────────────────

export function PipelineClient() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  return (
    <div style={{ width: "100%", padding: "var(--space-4) var(--space-5)" }}>
      <Flex align="center" gap="2" mb="2">
        <LayersIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">How It Works</Heading>
      </Flex>
      <Flex align="center" gap="3" mb="5">
        <Text color="gray" size="2">
          5-stage B2B lead generation pipeline — from company discovery through AI-personalized outreach.
        </Text>
      </Flex>
      <Flex align="center" gap="2" mb="5">
        <Badge color="blue" variant="soft" size="1">Interactive</Badge>
        <Text size="1" color="gray">Click a node for details. Drag to rearrange. Scroll to zoom.</Text>
      </Flex>

      <Flex direction="column" gap="6">
        {stages.map((stage, i) => (
          <div key={stage.title}>
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
        ))}
      </Flex>

      {selectedNode && <NodeDetailPanel nodeId={selectedNode} />}
    </div>
  );
}
