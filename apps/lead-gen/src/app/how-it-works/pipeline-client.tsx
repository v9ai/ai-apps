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
import { Badge, Flex, Heading, Text, Card, Code, Separator } from "@radix-ui/themes";
import { LayersIcon } from "@radix-ui/react-icons";
import { papers, researchStats, extraSections, technicalDetails } from "./data";

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

function ParallelNode({ data }: { data: Record<string, unknown> }) {
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
      <GitFork size={12} style={{ color }} />
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
    description: "Queries the Common Crawl CDX API (columnar index over 3+ billion crawled pages) using MIME-type and URL-prefix filters to surface B2B company homepages. Regex patterns match domain structures indicative of SaaS, AI tooling, and dev-tools companies — filtering before any content fetch to avoid downloading irrelevant WARC segments.",
    tech: [{ name: "Common Crawl CDX API" }, { name: "WARC segment streaming" }, { name: "URL prefix regex" }, { name: "scripts/boards:discover" }],
    dataIn: "CDX index URL-prefix + MIME filter queries",
    dataOut: "Ranked company domain URLs with crawl timestamps",
    insight: "CDX filtering on URL structure alone eliminates ~97% of irrelevant records before any content I/O — bandwidth cost scales with precision of the prefix query, not corpus size.",
    color: "red",
  },
  "live-fetch": {
    description: "Real-time company discovery via structured web search queries (site: operators, intitle: patterns, vertical-specific keyword combos) plus direct HTTP fetch for seed domains. Targets companies founded in the last 18 months that haven't appeared in Common Crawl snapshots yet. Applies heuristic B2B signal detection (pricing page presence, careers link, team page structure) before emitting a candidate.",
    tech: [{ name: "OpenRouter web-search" }, { name: "Vercel AI SDK streamText" }, { name: "HTTP fetch + cheerio" }, { name: "B2B heuristic scorer" }],
    dataIn: "Vertical-specific search queries + seed domain list",
    dataOut: "Company candidates with discovery confidence score",
    insight: "Recency bias is intentional: Common Crawl covers old companies well, so live search budget is concentrated on the trailing edge where competitive density is lowest.",
    color: "blue",
  },
  "bulk-csv": {
    description: "Ingests CSV exports from LinkedIn Sales Navigator, Apollo.io, or ZoomInfo via the /api/companies/bulk-import route. Normalizes heterogeneous column schemas (aliased headers, inconsistent phone formats, URL variants) to the Drizzle companies schema using a field-mapping layer. Row-level validation via Zod rejects malformed records without aborting the batch.",
    tech: [{ name: "/api/companies/bulk-import" }, { name: "Zod row validation" }, { name: "Drizzle ORM" }, { name: "papaparse" }],
    dataIn: "CSV file (LinkedIn Sales Nav / Apollo / ZoomInfo export format)",
    dataOut: "Validated, schema-normalized company records",
    insight: "Field-mapping is intentionally declarative rather than inferred — LLM-assisted column mapping was prototyped but produced silent misalignments on ambiguous headers like 'location' vs. 'hq_city'.",
    color: "violet",
  },
  "dedup-companies": {
    description: "Entity resolution layer that canonicalizes domains (strips www, trailing slashes, common redirect prefixes) and computes a deterministic slug before the Neon upsert. Uses ON CONFLICT (slug) DO NOTHING semantics — no fuzzy matching, intentionally. Fuzzy dedup (edit distance on company names) was benchmarked but produced too many false positives on subsidiary/parent pairs.",
    tech: [{ name: "URL normalization (RFC 3986)" }, { name: "Neon ON CONFLICT upsert" }, { name: "Drizzle ORM" }],
    dataIn: "Raw company URLs from all three discovery sources",
    dataOut: "Net-new companies (slug-unique)",
    insight: "Exact-match dedup over normalized slugs is a deliberate precision-over-recall tradeoff — a duplicate company is cheaper to handle later than a false merge that silently destroys a valid record.",
    color: "orange",
  },
  "neon-companies": {
    description: "Persists net-new companies to the Neon PostgreSQL companies table. Each row includes a stable UUID primary key, canonical slug, domain, name, and discovery_source metadata. The table is indexed on (slug), (domain), and (enriched_at IS NULL) — the last index drives the enrichment queue scan without a full table read.",
    tech: [{ name: "Neon PostgreSQL (serverless driver)" }, { name: "Drizzle ORM" }, { name: "@neondatabase/serverless" }, { name: "partial index on enriched_at IS NULL" }],
    dataIn: "Slug-deduplicated company records",
    dataOut: "Persisted company rows with UUID primary keys",
    insight: "The partial index WHERE enriched_at IS NULL turns the enrichment queue into a zero-cost O(1) scan — no separate queue table, no polling, just a filtered index walk.",
    color: "green",
  },
  // Stage 2: Enrichment
  "fetch-site": {
    description: "Fetches live website content for each unenriched company via the /api/companies/enhance route. Targets homepage, /about, /pricing, and /blog (if present) to maximize signal surface. Strips boilerplate (nav, footer, cookie banners) using CSS selector exclusions before passing to the extraction LLM — reducing prompt token count by 40–60% on average.",
    tech: [{ name: "HTTP fetch + cheerio" }, { name: "/api/companies/enhance" }, { name: "HTML boilerplate stripping" }, { name: "robots.txt compliance check" }],
    dataIn: "Company domain (enriched_at IS NULL queue)",
    dataOut: "Stripped website text: homepage + about + pricing sections",
    insight: "Selective page targeting (not full crawl) is a deliberate token budget decision — pricing and about pages carry ~10x the ICP-relevant signal density of homepage hero copy.",
    color: "blue",
  },
  "extract-signals": {
    description: "DeepSeek-V3 extracts structured signals from stripped website text using a chain-of-thought prompt that first reasons about business model, then lists services, then identifies tech stack mentions. Output is constrained to a Zod schema (services: string[], techStack: string[], businessModel: 'B2B'|'B2C'|'B2B2C', category: string) — the model is instructed to return null fields rather than hallucinate. Temperature 0.1 for reproducibility.",
    tech: [{ name: "DeepSeek-V3" }, { name: "Vercel AI SDK generateObject" }, { name: "Zod schema constraint" }, { name: "chain-of-thought prompt" }, { name: "temperature 0.1" }],
    dataIn: "Stripped website text (homepage + about + pricing)",
    dataOut: "Structured signals: { services, techStack, businessModel, category }",
    insight: "generateObject with a Zod schema enforces structured output at the SDK level — the model never sees a raw JSON instruction, eliminating the class of errors where the LLM wraps output in markdown code fences.",
    color: "amber",
  },
  "ai-classify": {
    description: "Zero-shot classification of each company into a fixed 3-tier AI taxonomy: not-AI, AI-first (AI as a product feature), or AI-native (AI as the core product). DeepSeek-V3 receives the extracted signals plus a few-shot exemplar set (3 per class) and returns a tier label with a calibrated confidence score (0–1). Low-confidence predictions (< 0.65) are flagged for manual review rather than auto-persisted.",
    tech: [{ name: "DeepSeek-V3" }, { name: "zero-shot + few-shot classification" }, { name: "confidence calibration" }, { name: "Vercel AI SDK generateObject" }, { name: "LangSmith tracing" }],
    dataIn: "Extracted signals + company description",
    dataOut: "AI tier label + confidence score + classification rationale",
    insight: "The 3-tier taxonomy is intentionally coarse — experiments with a 7-tier taxonomy showed inter-annotator agreement dropped below 60% on the intermediate tiers, making the finer labels unreliable as training signal.",
    color: "purple",
  },
  "deep-analysis": {
    description: "DeepSeek-V3 generates a structured company analysis using a multi-section chain-of-thought prompt: (1) technical maturity signals, (2) product focus and differentiation, (3) ICP fit scoring, (4) inferred hiring patterns from job board signals, (5) outreach angle — the most likely pain point to open with. Temperature 0.3 to allow some generation variance while keeping factual claims grounded in the extracted context.",
    tech: [{ name: "DeepSeek-V3" }, { name: "multi-section CoT prompt" }, { name: "temperature 0.3" }, { name: "LangSmith trace logging" }, { name: "Vercel AI SDK streamText" }],
    dataIn: "Extracted signals + AI tier + classification rationale",
    dataOut: "Structured analysis: { techMaturity, productFocus, icpScore, hiringSignals, outreachAngle }",
    insight: "Pre-computing the outreach angle at enrichment time — not at send time — breaks the latency dependency between LLM inference and email composition, enabling sub-second draft generation in the outreach step.",
    color: "purple",
  },
  "neon-enriched": {
    description: "Writes the enrichment payload back to the companies table via a Drizzle upsert keyed on company UUID. Sets enriched_at to NOW() to remove the row from the partial-index queue. The jsonb columns (services, tech_stack, deep_analysis) are stored as native PostgreSQL jsonb — no manual serialization needed, and jsonb operators (@>, ?) enable direct server-side filtering in downstream GraphQL queries.",
    tech: [{ name: "Neon PostgreSQL jsonb columns" }, { name: "Drizzle ORM" }, { name: "ON CONFLICT (id) DO UPDATE" }, { name: "@neondatabase/serverless" }],
    dataIn: "Enrichment payload: tier, confidence, services, tech_stack, deep_analysis",
    dataOut: "Updated company row with enriched_at timestamp set",
    insight: "Storing deep_analysis as jsonb rather than text enables jsonb path queries (e.g., filter companies where deep_analysis->>'outreachAngle' contains 'MLOps') without a full table scan or re-parsing in application code.",
    color: "green",
  },
  // Stage 2b: Enrichment gate nodes
  "schema-constrain": {
    description: "Zod validation gate applied to the raw JSON output from extract_signals before any LLM classification step. Enforces the CompanySignals schema: required fields (category, services array, techStack array, businessModel enum), value ranges, and string length bounds. Records that fail parsing are logged with the ZodError detail and routed to a dead-letter queue for manual review — they never reach the LLM tier.",
    tech: [{ name: "Zod" }, { name: "CompanySignals schema" }, { name: "Dead-letter queue" }],
    dataIn: "Raw extraction JSON from LLM",
    dataOut: "Validated CompanySignals object or parse error",
    insight: "Placing Zod validation between extraction and classification prevents malformed signals (truncated arrays, wrong enums) from silently corrupting the AI tier label — the most expensive downstream artifact to re-compute.",
    color: "cyan",
  },
  "confidence-gate": {
    description: "Hard threshold filter applied to the ai_tier_classify confidence score before writing enriched fields to Neon. Per-tier thresholds: not-AI ≥ 0.65, AI-first ≥ 0.72, AI-native ≥ 0.80. Records below threshold are marked enrichment_status = 'low_confidence' and queued for re-enrichment with a higher-capability model on the next escalation pass.",
    tech: [{ name: "Confidence score" }, { name: "Multi-Model Routing" }, { name: "Drizzle ORM" }],
    dataIn: "AI tier label + confidence score from DeepSeek",
    dataOut: "Pass (write) or reject (re-queue for escalation)",
    insight: "Per-tier thresholds reflect asymmetric error cost: a false AI-native label wastes personalized outreach budget; a false not-AI causes a missed opportunity — the gate is tuned to minimize the more expensive error type per tier.",
    color: "orange",
  },
  "snapshot-archive": {
    description: "Append-only write of the full enrichment payload to company_snapshots on every enrichment run, independent of the confidence gate outcome. Each row captures: company_id, enriched_at timestamp, ai_tier, confidence, services JSON, tech_stack JSON, and a SHA-256 content_hash of the website HTML. Enables drift detection by diffing consecutive snapshots — a content_hash change with a stable ai_tier signals copy refresh; a tier change with stable hash signals model drift.",
    tech: [{ name: "company_snapshots table" }, { name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }, { name: "SHA-256 content_hash" }],
    dataIn: "Full enrichment payload (all fields, pre-gate)",
    dataOut: "Immutable snapshot row in company_snapshots",
    insight: "Archiving pre-gate snapshots (not just passing records) gives an audit trail for threshold changes: if you lower the confidence cutoff retroactively, historical payloads are available to replay classification without re-fetching the website.",
    color: "teal",
  },
  // Stage 3: Lead Scoring
  "feature-extract": {
    description: "Reads enriched company fields from Neon and assembles a fixed-dimension numeric feature vector per company. Dimensions cover: AI tier (ordinal 0–2), employee count bucket (log-scaled), funding stage (ordinal), tech stack overlap with ICP target stack (Jaccard coefficient), services overlap, domain age (years), and whether the company has an active ATS board. All continuous features are z-score normalized against the current batch before downstream similarity computation.",
    tech: [{ name: "Drizzle ORM" }, { name: "z-score normalization" }, { name: "Jaccard similarity" }],
    dataIn: "Enriched company row (AI tier, tech stack, services, headcount, funding)",
    dataOut: "d-dimensional float32 feature vector per company",
    insight: "Normalizing within-batch rather than globally prevents distribution shift from stale reference statistics when the ICP evolves — each batch scores against its own population.",
    color: "cyan",
  },
  "icp-similarity": {
    description: "Computes cosine similarity between each company's feature vector and a pre-computed ICP centroid vector. The ICP centroid is the mean of feature vectors for all manually-confirmed ideal past targets. Cosine similarity is chosen over Euclidean distance because it is magnitude-invariant — company size differences do not dominate the signal. Output is a scalar in [−1, 1], stored as icp_score on the company row.",
    tech: [{ name: "Cosine similarity" }, { name: "ICP centroid vector" }, { name: "dot product / L2 norm" }],
    dataIn: "Company feature vector + ICP centroid vector",
    dataOut: "icp_score ∈ [−1, 1] per company",
    insight: "The ICP centroid is recomputed each time a confirmed positive is added — scoring is always relative to the current definition of 'ideal', not a frozen snapshot from months ago.",
    color: "violet",
  },
  "rank-compute": {
    description: "Combines icp_score with a recency signal (days since last enrichment, inverse-weighted) and a completeness score (fraction of enriched fields populated) into a composite lead score: 0.65 × icp_score + 0.20 × recency_weight + 0.15 × completeness_ratio. The composite score is then converted to a within-batch percentile rank using ordinal ranking, making the threshold in the downstream filter stable regardless of absolute score drift.",
    tech: [{ name: "Weighted linear combination" }, { name: "Percentile rank (ordinal)" }, { name: "Recency decay" }],
    dataIn: "icp_score + enrichment timestamp + field completeness ratio",
    dataOut: "composite_score + percentile_rank ∈ [0, 100] per company",
    insight: "Percentile ranking decouples the filter threshold from absolute score magnitude — setting 'keep top 40%' remains meaningful even as the ICP centroid shifts and raw scores change scale.",
    color: "purple",
  },
  "score-filter": {
    description: "Hard threshold gate: only companies with percentile_rank ≥ 60 (top 40% of the current batch) advance to the contact pipeline. Filtered-out companies have their lead_score and percentile_rank persisted with pipeline_status = 'deprioritized' rather than deleted — enabling threshold re-evaluation without re-running scoring. The p60 cutoff is configurable via LEAD_SCORE_PERCENTILE_THRESHOLD env var.",
    tech: [{ name: "Percentile threshold gate" }, { name: "Drizzle ORM upsert" }, { name: "LEAD_SCORE_PERCENTILE_THRESHOLD env" }],
    dataIn: "Scored companies with percentile_rank",
    dataOut: "Qualified leads (percentile_rank ≥ p60) → contact pipeline",
    insight: "Persisting rejected scores instead of discarding them means you can lower the threshold retroactively and immediately surface companies that narrowly missed the cut — no re-scoring required.",
    color: "orange",
  },
  "neon-scored": {
    description: "Writes composite_score, icp_score, percentile_rank, and pipeline_status back to the companies table. The partial index on pipeline_status = 'qualified' drives the contact pipeline queue scan — same zero-cost pattern as the enriched_at IS NULL index on the enrichment queue.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }, { name: "partial index on pipeline_status" }],
    dataIn: "Scored companies with percentile_rank and pipeline_status",
    dataOut: "Updated company rows with scoring metadata",
    insight: "A single partial index WHERE pipeline_status = 'qualified' turns the contact queue into a direct index scan — no separate staging table needed.",
    color: "green",
  },
  // Stage 4: Contact Pipeline
  "linkedin-source": {
    description: "LinkedIn profile data is the primary source for contact identity: full name, current title, company association, and seniority level are parsed from the profile URL and structured data. Title normalization maps free-text job titles to a canonical seniority taxonomy (IC / Manager / Director / VP / C-Suite) using a keyword-match classifier — avoiding LLM overhead for a deterministic mapping.",
    tech: [{ name: "LinkedIn profile parser" }, { name: "title normalization classifier" }, { name: "GraphQL addContact mutation" }, { name: "Drizzle ORM" }],
    dataIn: "LinkedIn profile URL + scraped profile metadata",
    dataOut: "Contact record draft: { name, title, seniorityTier, companyId, linkedinUrl }",
    insight: "LinkedIn URL is used as the dedup key (unique constraint on linkedin_url) rather than email — email can change, but the LinkedIn URL is stable for the lifetime of the professional identity.",
    color: "blue",
  },
  "email-discover": {
    description: "Generates candidate email addresses by combining the contact's name tokens with the company's MX-validated domain across all common B2B patterns (first.last@, flast@, first@, lastf@, firstlast@). Candidate ranking uses a pattern frequency prior derived from previously verified emails at the same domain — if first.last@ was valid for two prior contacts at the company, it gets rank-1 for all new contacts.",
    tech: [{ name: "Email pattern generator" }, { name: "MX record DNS lookup" }, { name: "domain-level pattern prior" }, { name: "SMTP RCPT TO probe (non-sending)" }],
    dataIn: "Contact name tokens + company domain",
    dataOut: "Ranked candidate email list (2–5 per contact) with pattern-prior confidence",
    insight: "Domain-level pattern priors collapse the verification search space: once a company's dominant pattern is confirmed from 3+ contacts, subsequent contacts get a single top-ranked candidate instead of the full 5-candidate set.",
    color: "amber",
  },
  "neverbounce": {
    description: "NeverBounce single-verify API checks deliverability for each candidate email. Returns one of five statuses: valid, invalid, disposable, catch-all, or unknown. Invalid and disposable are marked as such and stored — not discarded. Catch-all domains (where every address appears valid) are flagged separately and excluded from primary sends but kept for manual review.",
    tech: [{ name: "NeverBounce single-verify API" }, { name: "contact_emails table" }, { name: "catch-all domain registry" }],
    dataIn: "Ranked candidate email list",
    dataOut: "Emails with NeverBounce status: { email, status, is_primary, verified_at }",
    insight: "Catch-all detection is critical — sending to a catch-all domain has the same deliverability profile as sending to a random string, and bulk catch-all sends are a fast path to domain blacklisting.",
    color: "green",
  },
  "neon-contacts": {
    description: "Persists verified contacts to the contacts table and associated addresses to contact_emails, linked by contact UUID. The contacts table holds identity fields; contact_emails holds per-address deliverability state. This 1:N split supports multiple verified emails per contact (work + personal) and tracks bounce history per address independently — a bounce on one address doesn't invalidate others.",
    tech: [{ name: "Neon PostgreSQL" }, { name: "Drizzle ORM" }, { name: "contacts + contact_emails schema" }, { name: "FK: contacts.id → contact_emails.contact_id" }],
    dataIn: "Contact identity + verified emails with NeverBounce statuses",
    dataOut: "Persisted contact rows + contact_email rows with deliverability status",
    insight: "The 1:N contacts-to-emails schema enables per-address engagement tracking: open/click events are recorded against the specific email address, not the contact, enabling fine-grained deliverability scoring over time.",
    color: "green",
  },
  // Stage 5: Outreach Pipeline
  "compose-linkedin": {
    description: "Two-phase email composition: Phase 1 runs parallel context retrieval (company deep_analysis from DB + live LinkedIn profile signals) then calls DeepSeek-V3 at temperature 0.7 to generate a draft with explicit instructions to include one specific technical observation about the company. Phase 2 passes the draft to a refine prompt that strips AI-marker phrases ('I hope this finds you well', 'I wanted to reach out'), enforces a max 3-sentence opening, and tightens the subject line to under 50 characters.",
    tech: [{ name: "DeepSeek-V3" }, { name: "two-pass draft+refine pipeline" }, { name: "temperature 0.7 (draft) / 0.3 (refine)" }, { name: "Vercel AI SDK generateText" }, { name: "ComposeFromLinkedIn component" }],
    dataIn: "Contact LinkedIn URL + company deep_analysis + ICP score",
    dataOut: "Subject line + plain-text body + HTML body (spam-score checked)",
    insight: "The refine pass targets a specific failure mode: at temperature 0.7 the draft pass produces natural-sounding content but reliably includes 2–3 formulaic opener phrases — a targeted removal prompt outperforms lowering temperature, which would also reduce the technical specificity of the body.",
    color: "purple",
  },
  "batch-campaign": {
    description: "Groups contacts into campaign batches with configurable send sequences, inter-message delays (days), and follow-up counts (max 3). Campaign records are written to email_campaigns via GraphQL mutation before any send — enabling draft review and plan-approval before Resend is called. Contacts are grouped by company to stagger same-company sends and avoid triggering spam heuristics from multiple simultaneous touches.",
    tech: [{ name: "email_campaigns table" }, { name: "GraphQL createCampaign mutation" }, { name: "Drizzle ORM" }, { name: "plan-approval gate" }],
    dataIn: "Contact IDs + campaign config: { sequence, delayDays, maxFollowups, senderId }",
    dataOut: "Campaign records with status: draft | approved | sending",
    insight: "Same-company staggering (minimum 48h between touches to different contacts at the same company) is enforced at the campaign creation layer — it's cheaper to prevent the send than to explain to a prospect why three colleagues got the same pitch on the same day.",
    color: "amber",
  },
  "resend-deliver": {
    description: "Delivers approved campaign emails via the Resend API, one message per API call to preserve per-message reply-to threading. Each send stores the Resend message_id in the campaign record immediately after the API response — before any webhook fires. Batch sends are rate-limited to Resend's 10 req/s ceiling using a token-bucket implementation. Transient failures (5xx) trigger exponential backoff with jitter (base 1s, max 30s, 3 retries).",
    tech: [{ name: "Resend API v1" }, { name: "token-bucket rate limiter" }, { name: "exponential backoff + jitter" }, { name: "email_campaigns table" }],
    dataIn: "Approved campaign email records with rendered subject + body",
    dataOut: "Delivered message IDs stored per campaign record",
    insight: "Storing message_id synchronously (not via webhook) is the correct ordering — if the Resend API returns 200 but the webhook never fires due to a network partition, the message_id is still available for manual delivery status queries.",
    color: "amber",
  },
  "webhook-inbound": {
    description: "Resend webhooks deliver email.delivered, email.bounced, email.opened, email.clicked, and inbound.message events to a signed endpoint. HMAC-SHA256 signature verification runs before any DB write. Reply events (inbound.message) are parsed for the In-Reply-To header to correlate replies with the original campaign message_id, then stored in received_emails with thread context intact.",
    tech: [{ name: "Resend webhooks" }, { name: "HMAC-SHA256 signature verification" }, { name: "In-Reply-To header parsing" }, { name: "received_emails table" }, { name: "@neondatabase/serverless" }],
    dataIn: "Signed Resend webhook payload (delivery, bounce, open, click, inbound reply events)",
    dataOut: "received_email records + campaign status updates (bounced / replied / opened)",
    insight: "Correlating inbound replies via In-Reply-To (not From address) is critical — contacts often reply from a different address than the one the email was sent to, so From-based matching produces ~15% false negatives.",
    color: "blue",
  },
  "followup-schedule": {
    description: "Computes the next follow-up send time for each campaign thread using send history, reply status, and campaign config. Contacts with received_emails in the thread are immediately excluded (reply-aware suppression). Unsubscribe signals in inbound email bodies are detected via keyword matching and written to a do-not-contact list before scheduling runs. The scheduler queries only contacts where next_send_at <= NOW() using a Drizzle partial index scan.",
    tech: [{ name: "Drizzle ORM partial index scan" }, { name: "reply-aware suppression" }, { name: "unsubscribe keyword detector" }, { name: "do-not-contact list" }, { name: "campaign config (delayDays, maxFollowups)" }],
    dataIn: "Send history + reply status + unsubscribe signals from received_emails",
    dataOut: "Scheduled follow-up sends with next_send_at timestamps",
    insight: "Unsubscribe detection runs on inbound body text rather than relying solely on List-Unsubscribe headers — most B2B reply-unsubscribes are written in natural language ('please remove me') and would be missed by a header-only check.",
    color: "indigo",
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
  { id: "extract-signals", type: "agent", position: { x: 250, y: 40 }, data: { label: "extract_signals", sublabel: "Services / tech / industry", icon: Zap, color: "var(--amber-9)" } },
  { id: "schema-constrain", type: "condition", position: { x: 490, y: 40 }, data: { label: "schema_constrain (Zod)", color: "var(--cyan-9)" } },
  { id: "ai-classify", type: "agent", position: { x: 700, y: 0 }, data: { label: "ai_tier_classify", sublabel: "DeepSeek — not-AI / AI-first / AI-native", icon: Brain, color: "var(--purple-9)" } },
  { id: "deep-analysis", type: "agent", position: { x: 700, y: 90 }, data: { label: "deep_analysis", sublabel: "DeepSeek structured report", icon: Brain, color: "var(--purple-9)" } },
  { id: "confidence-gate", type: "condition", position: { x: 960, y: 40 }, data: { label: "confidence_gate (≥ 0.72)", color: "var(--orange-9)" } },
  { id: "snapshot-archive", type: "dataStore", position: { x: 960, y: 130 }, data: { label: "company_snapshots", sublabel: "Drift archive", icon: BarChart3, color: "var(--teal-9)" } },
  { id: "neon-enriched", type: "dataStore", position: { x: 1190, y: 40 }, data: { label: "companies (enriched)", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const enrichmentEdges: Edge[] = [
  { id: "e-fs-ex", source: "fetch-site", target: "extract-signals", ...edgeDefaults, label: "raw HTML", style: { ...edgeDefaults.style, stroke: "var(--blue-8)" } },
  { id: "e-ex-sc", source: "extract-signals", target: "schema-constrain", ...edgeDefaults, label: "raw JSON", style: { ...edgeDefaults.style, stroke: "var(--amber-8)" } },
  { id: "e-sc-cls", source: "schema-constrain", target: "ai-classify", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-sc-da", source: "schema-constrain", target: "deep-analysis", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-cls-cg", source: "ai-classify", target: "confidence-gate", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-da-cg", source: "deep-analysis", target: "confidence-gate", ...edgeDefaults, style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-cls-snap", source: "ai-classify", target: "snapshot-archive", ...edgeDefaults, label: "always", style: { ...edgeDefaults.style, stroke: "var(--purple-8)", strokeDasharray: "4 3" } },
  { id: "e-cg-neon", source: "confidence-gate", target: "neon-enriched", ...edgeDefaults, label: "pass", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
];

// ── Stage 3: Lead Scoring ────────────────────────────────────────────────────

const scoringNodes: Node[] = [
  { id: "feature-extract", type: "agent", position: { x: 0, y: 45 }, data: { label: "feature_extraction", sublabel: "Numeric vector from enriched fields", icon: Zap, color: "var(--cyan-9)" } },
  { id: "icp-similarity", type: "agent", position: { x: 270, y: 0 }, data: { label: "icp_similarity", sublabel: "Cosine sim against ICP centroid", icon: BarChart3, color: "var(--violet-9)" } },
  { id: "rank-compute", type: "agent", position: { x: 270, y: 100 }, data: { label: "rank_computation", sublabel: "Percentile rank · composite score", icon: Brain, color: "var(--purple-9)" } },
  { id: "score-filter", type: "condition", position: { x: 530, y: 50 }, data: { label: "score ≥ p60 threshold", color: "var(--orange-9)" } },
  { id: "neon-scored", type: "dataStore", position: { x: 730, y: 50 }, data: { label: "companies (scored)", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--green-9)" } },
];

const scoringEdges: Edge[] = [
  { id: "e-fe-icp", source: "feature-extract", target: "icp-similarity", ...edgeDefaults, animated: true, label: "d-dim vector", style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-fe-rank", source: "feature-extract", target: "rank-compute", ...edgeDefaults, animated: true, style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" } },
  { id: "e-icp-filter", source: "icp-similarity", target: "score-filter", ...edgeDefaults, label: "sim score", style: { ...edgeDefaults.style, stroke: "var(--violet-8)" } },
  { id: "e-rank-filter", source: "rank-compute", target: "score-filter", ...edgeDefaults, label: "percentile", style: { ...edgeDefaults.style, stroke: "var(--purple-8)" } },
  { id: "e-filter-neon", source: "score-filter", target: "neon-scored", ...edgeDefaults, label: "qualified leads", style: { ...edgeDefaults.style, stroke: "var(--orange-8)" } },
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
    description: "Live website fetch → layered signal extraction → Zod validation gate → parallel DeepSeek calls for AI tier classification (not-AI / AI-first / AI-native, per-tier confidence thresholds) and deep analysis → confidence gate filters low-confidence results → enriched fields written back to companies table; snapshots archived for drift detection.",
    pattern: "LLM-assisted classification",
    nodes: enrichmentNodes,
    edges: enrichmentEdges,
    height: 280,
  },
  {
    title: "lead_scoring",
    graphName: "lead_scoring",
    description: "Enriched company fields are projected into a normalized feature vector, scored by cosine similarity against the ICP centroid, combined with recency and completeness signals into a composite percentile rank, then filtered at p60 — only the top 40% advance to contact discovery.",
    pattern: "Feature-based ranking",
    nodes: scoringNodes,
    edges: scoringEdges,
    height: 220,
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

// ── Pipeline Stats Bar ───────────────────────────────────────────────────────

const pipelineStats = [
  { label: "5 stages", color: "violet" as const },
  { label: "4 LLM calls", color: "purple" as const },
  { label: "2-pass refinement", color: "amber" as const },
  { label: "NeverBounce verified", color: "green" as const },
];

function PipelineStatsBar() {
  return (
    <Flex align="center" gap="2" wrap="wrap" mb="5">
      {pipelineStats.map((stat) => (
        <Badge key={stat.label} color={stat.color} variant="soft" size="2"
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
          {stat.label}
        </Badge>
      ))}
    </Flex>
  );
}

// ── Node Type Legend ─────────────────────────────────────────────────────────

function NodeTypeLegend() {
  return (
    <Card mb="5" style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
      <Flex align="center" gap="2" mb="2">
        <BarChart3 size={13} style={{ color: "var(--gray-9)" }} />
        <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Node Types
        </Text>
      </Flex>
      <Flex gap="4" wrap="wrap">
        <Flex align="center" gap="2">
          <div style={{
            width: 28, height: 20, borderRadius: 4,
            background: "color-mix(in srgb, var(--violet-9) 14%, var(--color-background))",
            border: "1.5px solid color-mix(in srgb, var(--violet-9) 45%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Brain size={10} style={{ color: "var(--violet-9)" }} />
          </div>
          <Flex direction="column" gap="0">
            <Text size="1" weight="medium">agent</Text>
            <Text size="1" color="gray">processing step</Text>
          </Flex>
        </Flex>
        <Flex align="center" gap="2">
          <div style={{
            width: 28, height: 20, borderRadius: 4,
            background: "color-mix(in srgb, var(--green-9) 10%, var(--color-background))",
            border: "1.5px solid color-mix(in srgb, var(--green-9) 35%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Database size={10} style={{ color: "var(--green-9)" }} />
          </div>
          <Flex direction="column" gap="0">
            <Text size="1" weight="medium">dataStore</Text>
            <Text size="1" color="gray">persistence</Text>
          </Flex>
        </Flex>
        <Flex align="center" gap="2">
          <div style={{
            width: 28, height: 20, borderRadius: 4,
            background: "color-mix(in srgb, var(--orange-9) 16%, var(--color-background))",
            border: "1.5px solid color-mix(in srgb, var(--orange-9) 40%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Filter size={10} style={{ color: "var(--orange-9)" }} />
          </div>
          <Flex direction="column" gap="0">
            <Text size="1" weight="medium">condition</Text>
            <Text size="1" color="gray">routing / filter</Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

// ── Stage Connector ──────────────────────────────────────────────────────────

function StageConnector({ fromStage, toStage }: { fromStage: string; toStage: string }) {
  return (
    <Flex align="center" justify="center" direction="column" gap="1" py="1">
      <div style={{
        width: 2,
        height: 16,
        background: "linear-gradient(to bottom, var(--gray-a5), var(--gray-a7))",
        borderRadius: 4,
      }} />
      <Flex align="center" gap="2"
        style={{
          padding: "3px 10px",
          borderRadius: 4,
          background: "var(--gray-3)",
          border: "1px solid var(--gray-a5)",
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
        width: 2,
        height: 16,
        background: "linear-gradient(to bottom, var(--gray-a7), var(--gray-a5))",
        borderRadius: 4,
      }} />
    </Flex>
  );
}

// ── Stage-to-stage data flow labels ─────────────────────────────────────────

const stageConnectors: { fromStage: string; toStage: string }[] = [
  { fromStage: "companies", toStage: "enrichment" },
  { fromStage: "enriched_companies", toStage: "lead_scoring" },
  { fromStage: "scored_leads", toStage: "contact_pipeline" },
  { fromStage: "verified_contacts", toStage: "outreach_pipeline" },
];

// ── Empty State Panel ────────────────────────────────────────────────────────

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
        <Flex gap="2">
          <Badge variant="outline" size="1" color="gray">description</Badge>
          <Badge variant="outline" size="1" color="gray">tech stack</Badge>
          <Badge variant="outline" size="1" color="gray">input / output</Badge>
          <Badge variant="outline" size="1" color="gray">key insight</Badge>
        </Flex>
      </Flex>
    </Card>
  );
}

// ── Key Metrics ─────────────────────────────────────────────────────────────

function KeyMetrics() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <BarChart3 size={16} style={{ color: "var(--cyan-9)" }} />
        <Heading size="5">Key Metrics</Heading>
      </Flex>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {researchStats.map((stat) => (
          <Card key={stat.label} style={{ background: "var(--gray-2)", border: "1px solid var(--gray-a4)" }}>
            <Text size="6" weight="bold" style={{ fontFamily: "var(--code-font-family, monospace)", color: "var(--cyan-9)", display: "block" }}>
              {stat.number}
            </Text>
            <Text size="2" color="gray" as="p" style={{ lineHeight: 1.5, marginTop: 4 }}>{stat.label}</Text>
            <Text size="1" color="gray" style={{ opacity: 0.6 }}>{stat.source}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Deep-Dive Sections ──────────────────────────────────────────────────────

const sectionColors = ["violet", "green", "purple", "red", "amber", "blue", "cyan", "teal"] as const;

function DeepDiveSections() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <Brain size={16} style={{ color: "var(--violet-9)" }} />
        <Heading size="5">Deep Dive</Heading>
      </Flex>
      <Flex direction="column" gap="3">
        {extraSections.map((section, i) => (
          <Card key={section.heading} style={{ background: "var(--gray-2)", borderLeft: `3px solid var(--${sectionColors[i % sectionColors.length]}-9)` }}>
            <Heading size="3" mb="2">{section.heading}</Heading>
            <Text size="2" color="gray" as="p" style={{ lineHeight: 1.7 }}>{section.content}</Text>
            {section.codeBlock && (
              <pre style={{
                marginTop: 12, padding: 12, borderRadius: 6,
                background: "var(--gray-1)", border: "1px solid var(--gray-a4)",
                fontSize: 12, fontFamily: "var(--code-font-family, monospace)",
                color: "var(--gray-11)", overflow: "auto",
              }}>
                {section.codeBlock}
              </pre>
            )}
          </Card>
        ))}
      </Flex>
    </div>
  );
}

// ── Technical Details ────────────────────────────────────────────────────────

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
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</th>
                        <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--gray-a5)", color: "var(--gray-10)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Details</th>
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
                  padding: 14, borderRadius: 6,
                  background: "var(--gray-1)", border: "1px solid var(--gray-a4)",
                  fontSize: 12, fontFamily: "var(--code-font-family, monospace)",
                  color: "var(--gray-11)", overflow: "auto", lineHeight: 1.6,
                }}>
                  {detail.code}
                </pre>
              </Card>
            );
          }

          if (detail.type === "diagram" && detail.code) {
            return (
              <Card key={detail.heading} style={{ background: "var(--gray-2)", borderLeft: "3px solid var(--indigo-9)" }}>
                <Heading size="3" mb="1">{detail.heading}</Heading>
                <Text size="1" color="gray" mb="3" as="p">{detail.description}</Text>
                <pre style={{
                  padding: 14, borderRadius: 6,
                  background: "var(--gray-1)", border: "1px solid var(--indigo-a4)",
                  fontSize: 12, fontFamily: "var(--code-font-family, monospace)",
                  color: "var(--indigo-11)", overflow: "auto", lineHeight: 1.6,
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

// ── Technical Foundations ────────────────────────────────────────────────────

function TechFoundations() {
  return (
    <div>
      <Flex align="center" gap="2" mb="3">
        <Globe size={16} style={{ color: "var(--blue-9)" }} />
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
      <Flex align="center" gap="3" mb="4">
        <Text color="gray" size="2">
          5-stage B2B lead generation pipeline — from company discovery through AI-personalized outreach.
        </Text>
      </Flex>

      <PipelineStatsBar />

      <Flex align="center" gap="2" mb="4">
        <Badge color="blue" variant="soft" size="1">Interactive</Badge>
        <Text size="1" color="gray">Click a node for details. Drag to rearrange. Scroll to zoom.</Text>
      </Flex>

      <NodeTypeLegend />

      <Flex direction="column" gap="0">
        {stages.map((stage, i) => (
          <div key={stage.title}>
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

      {selectedNode ? <NodeDetailPanel nodeId={selectedNode} /> : <EmptyDetailPanel />}

      <Separator size="4" my="7" />
      <KeyMetrics />

      <Separator size="4" my="7" />
      <DeepDiveSections />

      <Separator size="4" my="7" />
      <TechnicalDetailSection />

      <Separator size="4" my="7" />
      <TechFoundations />
    </div>
  );
}
