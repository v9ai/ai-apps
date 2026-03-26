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
  Trash2,
  Mail,
  GraduationCap,
  BarChart3,
  RefreshCw,
  Shield,
  BookOpen,
} from "lucide-react";
import { Badge, Flex, Heading, Text, Card, Code } from "@radix-ui/themes";
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
  // Board Crawler
  "detect-index": {
    description: "Query Common Crawl CDX API to find pages matching Ashby job board patterns. Determines which CDX shards contain relevant data for the current crawl window.",
    tech: [{ name: "Common Crawl CDX" }, { name: "Rust / WASM" }],
    dataIn: "CDX API index", dataOut: "Matching page URLs",
    insight: "Ported from Rust ashby-crawler worker — web archive analysis discovers boards at scale", color: "red",
  },
  "crawl-pages": {
    description: "Fetch and parse discovered pages to extract job board URLs and metadata. Handles pagination, rate limiting, and HTML parsing for ATS-specific page structures.",
    tech: [{ name: "HTTP client" }, { name: "HTML parser" }],
    dataIn: "CDX page URLs", dataOut: "Parsed board URLs + metadata",
    insight: "Rate-limited crawling prevents IP blocks while maintaining high throughput", color: "red",
  },
  deduplicate: {
    description: "Remove duplicate boards already in the database. Uses URL normalization and fuzzy matching to catch near-duplicates from different CDX shards.",
    tech: [{ name: "URL normalization" }, { name: "Neon PostgreSQL" }],
    dataIn: "Crawled board URLs", dataOut: "Net-new boards only",
    insight: "Deduplication keeps the boards table clean and prevents redundant ingestion work", color: "orange",
  },
  "persist-boards": {
    description: "Write newly discovered boards to Neon PostgreSQL with metadata (ATS type, company, discovery timestamp). These become ingestion sources for downstream fetching.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Deduplicated boards", dataOut: "Persisted board records",
    insight: "Each new board automatically becomes a source for the ingest_jobs graph", color: "green",
  },
  // Ingest Jobs
  "fetch-stale": {
    description: "Query for ATS boards that haven't been fetched recently based on configurable staleness thresholds. Prioritizes boards with highest historical job yield.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Board staleness config", dataOut: "Stale source list",
    insight: "Prioritizing high-yield boards first maximizes new-job discovery per API call", color: "orange",
  },
  "route-stale": {
    description: "Conditional router: if no stale sources are found, short-circuit to END. Otherwise proceed to batch ingestion. This early-exit pattern avoids unnecessary API calls.",
    tech: [{ name: "LangGraph conditional_edges" }],
    dataIn: "Stale sources count", dataOut: "Route: ingest_batch or __end__",
    insight: "Early exit optimization — skip expensive API work when all sources are fresh", color: "crimson",
  },
  "ingest-batch": {
    description: "Pull job listings from ATS APIs (Greenhouse, Lever, Ashby) in batches. A unified fetcher layer normalizes 3 different API formats into one Drizzle schema.",
    tech: [{ name: "Greenhouse API" }, { name: "Lever API" }, { name: "Ashby API" }],
    dataIn: "Stale board URLs", dataOut: "Raw job records",
    insight: "Unified ingestion normalizes 3 ATS API formats into a single schema", color: "orange",
  },
  summarize: {
    description: "Aggregate ingestion results: count new jobs, updated jobs, and errors per source. Write stats to the ingestion_runs table for monitoring dashboards.",
    tech: [{ name: "Neon PostgreSQL" }],
    dataIn: "Ingestion results", dataOut: "Stats + persisted jobs",
    insight: "Per-source stats enable tracking ingestion health and catching API degradation early", color: "green",
  },
  // EU Classifier
  "extract-signals": {
    description: "Parse job listing for EU-remote signals: location mentions, timezone requirements, visa needs, legal entity hints, 'remote' keywords, and salary currency.",
    tech: [{ name: "Rule engine" }, { name: "Regex patterns" }],
    dataIn: "Job description + metadata", dataOut: "Structured signal dict",
    insight: "Signal extraction is deterministic and free — provides the input for both heuristic and LLM paths", color: "blue",
  },
  "heuristic-check": {
    description: "Score extracted signals using a weighted heuristic. If confidence exceeds threshold (e.g., 'Remote — EU only' in title), classify immediately without LLM.",
    tech: [{ name: "Weighted scoring" }, { name: "Confidence threshold" }],
    dataIn: "Extracted signals", dataOut: "Heuristic classification + confidence",
    insight: "Fast heuristic handles ~60% of jobs, saving LLM costs for ambiguous cases only", color: "blue",
  },
  "route-heuristic": {
    description: "Conditional router: if heuristic confidence is above threshold, go to persist_and_end. Otherwise escalate to DeepSeek LLM for nuanced classification.",
    tech: [{ name: "LangGraph conditional_edges" }],
    dataIn: "Heuristic confidence", dataOut: "Route: persist or deepseek",
    insight: "Multi-model routing: cheap heuristic first, escalate to LLM only on low confidence", color: "crimson",
  },
  "deepseek-classify": {
    description: "Use DeepSeek LLM with schema-constrained output (Zod) to classify ambiguous jobs. Receives extracted signals as context to ground the LLM decision.",
    tech: [{ name: "DeepSeek AI" }, { name: "Zod schema" }, { name: "Vercel AI SDK" }],
    dataIn: "Job + signals context", dataOut: "is_remote_eu + reasoning",
    insight: "Schema-constrained LLM output prevents hallucination; signals provide grounding context", color: "amber",
  },
  "persist-eu": {
    description: "Write EU classification result (boolean + confidence + source + reasoning) back to the jobs table. Records whether result came from heuristic or LLM path.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "Classification result", dataOut: "Updated job record",
    insight: "Tracking classification source (heuristic vs LLM) enables accuracy analysis per path", color: "green",
  },
  // Process Jobs
  enhance: {
    description: "Fetch full job details — descriptions, requirements, benefits, locations — from ATS APIs for each discovered job. Runs with concurrency limits and retry logic.",
    tech: [{ name: "ATS API clients" }, { name: "GraphQL mutations" }],
    dataIn: "Job IDs", dataOut: "Enriched job records",
    insight: "Batch processing with exponential backoff retry handles API rate limits gracefully", color: "orange",
  },
  "role-tag": {
    description: "Classify job into role categories (engineering, product, design, etc.) and seniority levels. Uses structured LLM output validated against a fixed taxonomy.",
    tech: [{ name: "DeepSeek AI" }, { name: "Role taxonomy" }],
    dataIn: "Job description", dataOut: "Role category + seniority",
    insight: "Fixed taxonomy prevents category drift across classification runs", color: "amber",
  },
  "eu-classify": {
    description: "Invoke the eu_classifier sub-graph to determine EU remote compatibility. Delegates to the heuristic → LLM escalation pipeline.",
    tech: [{ name: "eu_classifier graph" }],
    dataIn: "Enriched job", dataOut: "is_remote_eu boolean",
    insight: "Graph composition — process_jobs delegates to eu_classifier as a sub-graph", color: "blue",
  },
  "skill-extract": {
    description: "Extract technical skills from job descriptions using LLM pipeline. All skills validated against curated taxonomy to prevent semantic drift.",
    tech: [{ name: "LLM pipeline" }, { name: "Skill taxonomy" }, { name: "Neon PostgreSQL" }],
    dataIn: "Job description", dataOut: "Validated skill tags",
    insight: "Grounding-first: skills validated against curated taxonomy prevents drift over time", color: "amber",
  },
  // Job Matcher
  "fetch-candidates": {
    description: "Query Neon PostgreSQL for EU-remote jobs matching basic criteria (recency, not stale, has skills). Returns candidate pool for scoring.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }],
    dataIn: "User skills + filters", dataOut: "Candidate job pool",
    insight: "Database-level filtering reduces the candidate set before expensive LLM scoring", color: "green",
  },
  "score-llm": {
    description: "Use DeepSeek to score job title relevance against user's skill profile. LLM provides nuanced understanding of role-skill fit beyond keyword matching.",
    tech: [{ name: "DeepSeek AI" }, { name: "Batch scoring" }],
    dataIn: "Candidate jobs + user skills", dataOut: "Per-job role relevance scores",
    insight: "LLM scoring catches semantic matches (e.g., 'ML Engineer' matches 'PyTorch' skills)", color: "amber",
  },
  "compute-composite": {
    description: "Combine LLM role scores with skill overlap ratio and recency decay into a single composite score. Weighted formula tunable per user preference.",
    tech: [{ name: "Composite scoring" }, { name: "Decay function" }],
    dataIn: "Role scores + skill overlap + dates", dataOut: "Composite scores",
    insight: "Multi-signal composite score outperforms any single ranking factor alone", color: "indigo",
  },
  "rank-return": {
    description: "Sort candidates by composite score, apply limit, and return ranked results with score breakdowns for transparency.",
    tech: [{ name: "Sort + limit" }],
    dataIn: "Scored candidates", dataOut: "Ranked job matches",
    insight: "Score breakdowns let users understand why each job was recommended", color: "indigo",
  },
  // Email Outreach
  "research-contact": {
    description: "Research the recipient's professional background, current role, and interests from LinkedIn profile data and company context.",
    tech: [{ name: "LinkedIn data" }, { name: "DeepSeek AI" }],
    dataIn: "Recipient profile", dataOut: "Contact context analysis",
    insight: "Parallel research cuts total latency by ~60% vs sequential execution", color: "purple",
  },
  "research-company": {
    description: "Research the recipient's company: product focus, engineering culture, tech investment signals, and hiring patterns.",
    tech: [{ name: "Company data" }, { name: "DeepSeek AI" }],
    dataIn: "Company identifier", dataOut: "Company research context",
    insight: "Company context grounds the email in specific, relevant details", color: "purple",
  },
  "analyze-post": {
    description: "Analyze the LinkedIn post or content being replied to. Extract topics, intent, engagement hooks, and key quotes for the email draft.",
    tech: [{ name: "DeepSeek AI" }, { name: "PostAnalysis schema" }],
    dataIn: "Post URL + text", dataOut: "Post analysis (topics, hooks, quotes)",
    insight: "Post analysis creates natural conversation starters that feel genuine, not templated", color: "purple",
  },
  "draft-email": {
    description: "Generate initial email draft using all three research contexts (contact + company + post). Structured output ensures subject, text, and HTML variants.",
    tech: [{ name: "DeepSeek AI" }, { name: "EmailDraft schema" }],
    dataIn: "3 research contexts joined", dataOut: "Draft email (subject + body)",
    insight: "Three-context grounding produces highly personalized emails at scale", color: "amber",
  },
  "refine-email": {
    description: "Second-pass refinement: check tone, length, remove AI-sounding phrases, ensure call-to-action is clear. Outputs final polished email.",
    tech: [{ name: "DeepSeek AI" }, { name: "Tone calibration" }],
    dataIn: "Draft email", dataOut: "Refined final email",
    insight: "Two-pass generation catches AI artifacts that a single pass would miss", color: "amber",
  },
  // Application Prep
  "validate-urls": {
    description: "Validate that company career page and job listing URLs are accessible before starting expensive research. Fail fast on broken links.",
    tech: [{ name: "HTTP HEAD checks" }],
    dataIn: "Application URLs", dataOut: "Validated URLs",
    insight: "Fail-fast validation prevents wasted LLM calls on dead listings", color: "gray",
  },
  "parse-jd": {
    description: "Parse job description to extract structured data: tech stack, requirements, role type, and seniority level.",
    tech: [{ name: "DeepSeek AI" }, { name: "ParsedJD schema" }],
    dataIn: "Job description text", dataOut: "Structured JD (tech, requirements, seniority)",
    insight: "Structured JD extraction feeds all downstream generation with consistent data", color: "amber",
  },
  "analyze-depth": {
    description: "Deep analysis of role signals: team structure hints, technical maturity, growth stage, hidden requirements, key challenges, and interview focus areas.",
    tech: [{ name: "DeepSeek AI" }, { name: "RoleDepth schema" }],
    dataIn: "Job description", dataOut: "Role depth analysis",
    insight: "Surfaces hidden signals (team size, maturity) that candidates typically miss", color: "amber",
  },
  "research-co": {
    description: "Research company background: overview, product focus, engineering culture, tech investment signals, competitive landscape, and talking points.",
    tech: [{ name: "DeepSeek AI" }, { name: "CompanyResearch schema" }],
    dataIn: "Company identifier", dataOut: "Company research report",
    insight: "Company research generates interview talking points grounded in real data", color: "purple",
  },
  "extract-tech": {
    description: "Extract technologies mentioned in the JD with relevance scoring. Each tech gets a tag, label, category, and relevance score.",
    tech: [{ name: "DeepSeek AI" }, { name: "ExtractedTech schema" }],
    dataIn: "Job description", dataOut: "Extracted technologies with scores",
    insight: "Relevance scoring prioritizes which technologies to study first", color: "amber",
  },
  "organize-hier": {
    description: "Organize extracted technologies into a learning hierarchy. Groups related techs and determines study order based on dependencies.",
    tech: [{ name: "Taxonomy engine" }],
    dataIn: "Extracted technologies", dataOut: "Organized tech hierarchy",
    insight: "Hierarchy ensures prerequisites are covered before advanced topics", color: "orange",
  },
  "fan-work": {
    description: "Three-way fan-out: generate interview questions, generate study content, and compile the final report — all in parallel using Annotated[List, operator.add].",
    tech: [{ name: "LangGraph fan-out" }, { name: "operator.add accumulation" }],
    dataIn: "All research results", dataOut: "3 parallel work streams",
    insight: "Fan-out with accumulating state is LangGraph's killer pattern for parallel work", color: "purple",
  },
  "gen-questions": {
    description: "Generate interview questions across 4 categories (technical, behavioral, system_design, company_culture) with model answers and evaluation criteria.",
    tech: [{ name: "DeepSeek AI" }, { name: "4-category fan-out" }],
    dataIn: "Parsed JD + role depth", dataOut: "Question sets (4 categories)",
    insight: "4-way sub-fan-out generates all question categories in parallel", color: "amber",
  },
  "gen-content": {
    description: "Generate study content for each technology in the hierarchy. Produces structured learning materials with examples and key concepts.",
    tech: [{ name: "DeepSeek AI" }, { name: "Per-tech fan-out" }],
    dataIn: "Tech hierarchy", dataOut: "Generated study content",
    insight: "N-way fan-out scales content generation linearly with tech count", color: "amber",
  },
  "compile-report": {
    description: "Compile all generated content into a comprehensive preparation report: questions, study materials, company talking points, and interview strategy.",
    tech: [{ name: "Markdown generation" }],
    dataIn: "Questions + content + research", dataOut: "Full prep report",
    insight: "Single compilation point ensures consistency across all generated sections", color: "blue",
  },
  "persist-knowledge": {
    description: "Persist generated study content to the knowledge database (LanceDB) for future retrieval. Enables building a personal tech knowledge base over time.",
    tech: [{ name: "LanceDB" }, { name: "Neon PostgreSQL" }],
    dataIn: "Generated content", dataOut: "Persisted knowledge entries",
    insight: "Knowledge accumulates across applications — each prep session makes the next one better", color: "green",
  },
};

// ── All nodes for detail lookup ──────────────────────────────────────────────
// (built lazily from stages below)

// ── Stage 1: Board Crawler ───────────────────────────────────────────────────

const crawlerNodes: Node[] = [
  { id: "detect-index", type: "agent", position: { x: 0, y: 40 }, data: { label: "detect_index", sublabel: "Common Crawl CDX API", icon: Globe, color: "var(--red-9)" } },
  { id: "crawl-pages", type: "agent", position: { x: 270, y: 40 }, data: { label: "crawl_pages", sublabel: "Parse ATS board HTML", icon: Search, color: "var(--red-9)" } },
  { id: "deduplicate", type: "agent", position: { x: 530, y: 40 }, data: { label: "deduplicate", sublabel: "URL normalization", icon: Filter, color: "var(--orange-9)" } },
  { id: "persist-boards", type: "dataStore", position: { x: 770, y: 45 }, data: { label: "persist", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const crawlerEdges: Edge[] = [
  { id: "e-detect-crawl", source: "detect-index", target: "crawl-pages", ...edgeDefaults, label: "page URLs", style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "e-crawl-dedup", source: "crawl-pages", target: "deduplicate", ...edgeDefaults, label: "raw boards", style: { ...edgeDefaults.style, stroke: "var(--red-8)" } },
  { id: "e-dedup-persist", source: "deduplicate", target: "persist-boards", ...edgeDefaults, label: "net-new", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
];

// ── Stage 2: Ingest Jobs ─────────────────────────────────────────────────────

const ingestNodes: Node[] = [
  { id: "fetch-stale", type: "agent", position: { x: 0, y: 40 }, data: { label: "fetch_stale_sources", sublabel: "Prioritize high-yield boards", icon: Database, color: "var(--orange-9)" } },
  { id: "route-stale", type: "condition", position: { x: 300, y: 50 }, data: { label: "sources found?", color: "var(--crimson-9)" } },
  { id: "ingest-batch", type: "agent", position: { x: 500, y: 40 }, data: { label: "ingest_batch", sublabel: "Greenhouse / Lever / Ashby", icon: Layers, color: "var(--orange-9)" } },
  { id: "summarize", type: "dataStore", position: { x: 750, y: 45 }, data: { label: "summarize", sublabel: "Stats → Neon", icon: Database, color: "var(--green-9)" } },
];

const ingestEdges: Edge[] = [
  { id: "e-fetch-route", source: "fetch-stale", target: "route-stale", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "e-route-ingest", source: "route-stale", target: "ingest-batch", ...edgeDefaults, animated: true, label: "yes", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "e-ingest-sum", source: "ingest-batch", target: "summarize", ...edgeDefaults, label: "raw jobs", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
];

// ── Stage 3: EU Classifier (heuristic → LLM escalation) ─────────────────────

const euNodes: Node[] = [
  { id: "extract-signals", type: "agent", position: { x: 0, y: 50 }, data: { label: "extract_signals", sublabel: "Location, timezone, visa", icon: Search, color: "var(--blue-9)" } },
  { id: "heuristic-check", type: "agent", position: { x: 270, y: 50 }, data: { label: "heuristic_check", sublabel: "Weighted scoring", icon: Zap, color: "var(--blue-9)" } },
  { id: "route-heuristic", type: "condition", position: { x: 510, y: 60 }, data: { label: "confident?", color: "var(--crimson-9)" } },
  { id: "deepseek-classify", type: "agent", position: { x: 700, y: 0 }, data: { label: "deepseek_classify", sublabel: "Schema-constrained LLM", icon: Brain, color: "var(--amber-9)" } },
  { id: "persist-eu", type: "dataStore", position: { x: 700, y: 110 }, data: { label: "persist_and_end", sublabel: "is_remote_eu → Neon", icon: Database, color: "var(--green-9)" } },
];

const euEdges: Edge[] = [
  { id: "e-ext-heur", source: "extract-signals", target: "heuristic-check", ...edgeDefaults, label: "signals", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-heur-route", source: "heuristic-check", target: "route-heuristic", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-route-ds", source: "route-heuristic", target: "deepseek-classify", ...edgeDefaults, animated: true, label: "low conf", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-route-persist", source: "route-heuristic", target: "persist-eu", ...edgeDefaults, label: "high conf", style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "e-ds-persist", source: "deepseek-classify", target: "persist-eu", ...edgeDefaults, label: "LLM result", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
];

// ── Stage 4: Process Jobs (4-phase pipeline) ─────────────────────────────────

const processNodes: Node[] = [
  { id: "enhance", type: "agent", position: { x: 0, y: 40 }, data: { label: "enhance", sublabel: "Full details from ATS", icon: Zap, color: "var(--orange-9)" } },
  { id: "role-tag", type: "agent", position: { x: 260, y: 40 }, data: { label: "role_tag", sublabel: "Category + seniority", icon: Layers, color: "var(--amber-9)" } },
  { id: "eu-classify", type: "agent", position: { x: 510, y: 40 }, data: { label: "eu_classify", sublabel: "→ eu_classifier graph", icon: Globe, color: "var(--blue-9)" } },
  { id: "skill-extract", type: "agent", position: { x: 760, y: 40 }, data: { label: "skill_extract", sublabel: "LLM + taxonomy", icon: FileText, color: "var(--amber-9)" } },
];

const processEdges: Edge[] = [
  { id: "e-enh-role", source: "enhance", target: "role-tag", ...edgeDefaults, label: "enriched job", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  { id: "e-role-eu", source: "role-tag", target: "eu-classify", ...edgeDefaults, label: "tagged job", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-eu-skill", source: "eu-classify", target: "skill-extract", ...edgeDefaults, label: "classified", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
];

// ── Stage 5: Job Matcher ─────────────────────────────────────────────────────

const matcherNodes: Node[] = [
  { id: "fetch-candidates", type: "agent", position: { x: 0, y: 40 }, data: { label: "fetch_candidates", sublabel: "EU-remote + skill filter", icon: Database, color: "var(--green-9)" } },
  { id: "score-llm", type: "agent", position: { x: 280, y: 40 }, data: { label: "score_titles_llm", sublabel: "DeepSeek role scoring", icon: Brain, color: "var(--amber-9)" } },
  { id: "compute-composite", type: "agent", position: { x: 540, y: 40 }, data: { label: "compute_composite", sublabel: "Multi-signal ranking", icon: BarChart3, color: "var(--indigo-9)" } },
  { id: "rank-return", type: "dataStore", position: { x: 790, y: 45 }, data: { label: "rank_and_return", sublabel: "Sorted results", icon: Search, color: "var(--indigo-9)" } },
];

const matcherEdges: Edge[] = [
  { id: "e-fetch-score", source: "fetch-candidates", target: "score-llm", ...edgeDefaults, label: "candidate pool", style: { ...edgeDefaults.style, stroke: "var(--green-8)" } },
  { id: "e-score-comp", source: "score-llm", target: "compute-composite", ...edgeDefaults, label: "role scores", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-comp-rank", source: "compute-composite", target: "rank-return", ...edgeDefaults, animated: true, label: "ranked", style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" } },
];

// ── Stage 6: Email Outreach (parallel research → draft → refine) ─────────────

const outreachNodes: Node[] = [
  { id: "research-contact", type: "agent", position: { x: 0, y: 0 }, data: { label: "research_contact", sublabel: "LinkedIn profile analysis", icon: Search, color: "var(--purple-9)" } },
  { id: "research-company", type: "agent", position: { x: 0, y: 100 }, data: { label: "research_company", sublabel: "Company deep-dive", icon: BookOpen, color: "var(--purple-9)" } },
  { id: "analyze-post", type: "agent", position: { x: 0, y: 200 }, data: { label: "analyze_post", sublabel: "Post topics & hooks", icon: FileText, color: "var(--purple-9)" } },
  { id: "draft-email", type: "agent", position: { x: 330, y: 90 }, data: { label: "draft_email", sublabel: "3-context grounded draft", icon: Mail, color: "var(--amber-9)" } },
  { id: "refine-email", type: "agent", position: { x: 600, y: 90 }, data: { label: "refine_email", sublabel: "Tone + de-AI polish", icon: RefreshCw, color: "var(--amber-9)" } },
];

const outreachEdges: Edge[] = [
  { id: "e-rc-draft", source: "research-contact", target: "draft-email", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-rco-draft", source: "research-company", target: "draft-email", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-ap-draft", source: "analyze-post", target: "draft-email", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-draft-refine", source: "draft-email", target: "refine-email", ...edgeDefaults, label: "draft v1", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
];

// ── Stage 7: Application Prep (mega-pipeline) ───────────────────────────────

const appPrepNodes: Node[] = [
  // Phase 1: parallel research (5-way fan-out)
  { id: "validate-urls", type: "agent", position: { x: 0, y: 0 }, data: { label: "validate_urls", sublabel: "HTTP HEAD checks", icon: Shield, color: "var(--gray-11)" } },
  { id: "parse-jd", type: "agent", position: { x: 0, y: 80 }, data: { label: "parse_jd", sublabel: "Tech + requirements", icon: FileText, color: "var(--amber-9)" } },
  { id: "analyze-depth", type: "agent", position: { x: 0, y: 160 }, data: { label: "analyze_role_depth", sublabel: "Hidden signals", icon: Brain, color: "var(--amber-9)" } },
  { id: "research-co", type: "agent", position: { x: 0, y: 240 }, data: { label: "research_company", sublabel: "Culture + tech investment", icon: BookOpen, color: "var(--purple-9)" } },
  { id: "extract-tech", type: "agent", position: { x: 0, y: 320 }, data: { label: "extract_technologies", sublabel: "Tags + relevance scores", icon: Layers, color: "var(--amber-9)" } },
  // Phase 2: organize
  { id: "organize-hier", type: "agent", position: { x: 310, y: 155 }, data: { label: "organize_hierarchy", sublabel: "Learning order", icon: Workflow, color: "var(--orange-9)" } },
  // Phase 3: fan-out work
  { id: "fan-work", type: "parallel", position: { x: 540, y: 168 }, data: { label: "route_all_work", color: "var(--purple-9)" } },
  { id: "gen-questions", type: "agent", position: { x: 700, y: 60 }, data: { label: "generate_questions", sublabel: "4 categories parallel", icon: GraduationCap, color: "var(--amber-9)" } },
  { id: "gen-content", type: "agent", position: { x: 700, y: 170 }, data: { label: "generate_content", sublabel: "Per-tech study material", icon: BookOpen, color: "var(--amber-9)" } },
  { id: "compile-report", type: "agent", position: { x: 700, y: 280 }, data: { label: "compile_report", sublabel: "Full prep document", icon: FileText, color: "var(--blue-9)" } },
  // Phase 4: persist
  { id: "persist-knowledge", type: "dataStore", position: { x: 960, y: 175 }, data: { label: "persist_knowledge", sublabel: "LanceDB + Neon", icon: Database, color: "var(--green-9)" } },
];

const appPrepEdges: Edge[] = [
  // Phase 1 → organize
  { id: "e-val-org", source: "validate-urls", target: "organize-hier", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--gray-8)" } },
  { id: "e-parse-org", source: "parse-jd", target: "organize-hier", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-depth-org", source: "analyze-depth", target: "organize-hier", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-rco-org", source: "research-co", target: "organize-hier", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-tech-org", source: "extract-tech", target: "organize-hier", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  // organize → fan-out
  { id: "e-org-fan", source: "organize-hier", target: "fan-work", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
  // fan-out → work
  { id: "e-fan-q", source: "fan-work", target: "gen-questions", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-fan-c", source: "fan-work", target: "gen-content", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-fan-r", source: "fan-work", target: "compile-report", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  // join → persist
  { id: "e-q-persist", source: "gen-questions", target: "persist-knowledge", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-c-persist", source: "gen-content", target: "persist-knowledge", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-r-persist", source: "compile-report", target: "persist-knowledge", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
];

// ── Stage definitions ────────────────────────────────────────────────────────

const stages = [
  {
    title: "board_crawler",
    graphName: "board_crawler",
    description: "Discover ATS job boards from Common Crawl CDX index. Ported from the Rust ashby-crawler worker.",
    pattern: "Linear pipeline",
    nodes: crawlerNodes,
    edges: crawlerEdges,
    height: 150,
  },
  {
    title: "ingest_jobs",
    graphName: "ingest_jobs",
    description: "Fetch jobs from stale ATS sources with early-exit optimization when all sources are fresh.",
    pattern: "Conditional early exit",
    nodes: ingestNodes,
    edges: ingestEdges,
    height: 150,
  },
  {
    title: "eu_classifier",
    graphName: "eu_classifier",
    description: "Heuristic-first classification with LLM escalation. Fast heuristic handles ~60% of jobs; DeepSeek only called for ambiguous cases.",
    pattern: "Multi-model escalation",
    nodes: euNodes,
    edges: euEdges,
    height: 220,
  },
  {
    title: "process_jobs",
    graphName: "process_jobs",
    description: "Four-phase sequential pipeline: enhance → role_tag → eu_classify (sub-graph) → skill_extract. Accumulates results via Annotated[List, operator.add].",
    pattern: "Sequential accumulation",
    nodes: processNodes,
    edges: processEdges,
    height: 150,
  },
  {
    title: "job_matcher",
    graphName: "job_matcher",
    description: "Score and rank jobs against a candidate's skill profile. Combines LLM role scoring with skill overlap and recency decay.",
    pattern: "Composite scoring pipeline",
    nodes: matcherNodes,
    edges: matcherEdges,
    height: 150,
  },
  {
    title: "email_outreach",
    graphName: "email_outreach",
    description: "Three parallel research branches (contact, company, post) join into a draft, then a refinement pass removes AI artifacts.",
    pattern: "Parallel fan-out → join → refine",
    nodes: outreachNodes,
    edges: outreachEdges,
    height: 300,
  },
  {
    title: "application_prep",
    graphName: "application_prep",
    description: "The largest graph: 5-way parallel research → organize → 3-way fan-out (questions, content, report) → persist to knowledge DB. Nested fan-outs for per-category and per-tech generation.",
    pattern: "Multi-phase fan-out/join mega-pipeline",
    nodes: appPrepNodes,
    edges: appPrepEdges,
    height: 420,
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
      <Flex align="center" gap="3" mb="3">
        <Text color="gray" size="2">
          20 LangGraph StateGraphs power the pipeline — from board discovery to interview prep.
        </Text>
        <a href="https://github.com/nicolad/lead-gen" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}>
          <GitHubLogoIcon width={16} height={16} />
        </a>
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
