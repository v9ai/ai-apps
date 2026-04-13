import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Grid,
  Button,
} from "@radix-ui/themes";
import {
  Github,
  Brain,
  Search,
  Cpu,
  ShieldCheck,
  Upload,
  Layers,
  ChevronDown,
  Database,
  GitMerge,
  Zap,
  Lock,
  Server,
  BarChart3,
  Combine,
  TrendingUp,
  Heart,
  Pill,
  Calendar,
  Activity,
  Eye,
  AlertTriangle,
  FlaskConical,
  ArrowLeftRight,
  FileCheck,
  MessageSquare,
  TestTube,
  Gauge,
  CheckCircle2,
  Table2,
  RefreshCw,
  Timer,
  Wifi,
  KeyRound,
  UserCheck,
  GitBranch,
  Fingerprint,
  Globe,
  Dumbbell,
  BrainCircuit,
  LineChart,
  ArrowUpDown,
  Network,
  ScanSearch,
  Sparkles,
  Shield,
  Trash2,
  Scale,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { HowItWorksClient } from "./how-it-works-client";
import {
  IngestionFlow,
  PipelineFlow,
  RetrievalFlow,
  GuardFlow,
  EmbeddingFlow,
} from "./architecture-flow";

export const metadata: Metadata = {
  title: "How It Works | Agentic Healthcare",
  description:
    "A LangGraph-powered platform that transforms blood test PDFs into AI-driven health insights using agentic triage, multi-table retrieval, and safety-guarded synthesis.",
};

/* ── Data ─────────────────────────────────────────────────────────── */

const heroNodes = [
  {
    icon: Brain,
    label: "Triage",
    sub: "8 intent classes",
    color: "var(--indigo-9)",
  },
  {
    icon: Search,
    label: "Retrieve",
    sub: "7 entity tables",
    color: "var(--blue-9)",
  },
  {
    icon: Cpu,
    label: "Synthesize",
    sub: "Clinical safety",
    color: "var(--amber-9)",
  },
  {
    icon: ShieldCheck,
    label: "Guard",
    sub: "5 safety rules",
    color: "var(--green-9)",
  },
];

const archSections = [
  {
    id: "ingestion",
    num: "01",
    icon: Upload,
    iconColor: "var(--orange-9)",
    iconBg: "var(--orange-a3)",
    title: "PDF Ingestion Pipeline",
    brief: "Upload \u2192 Parse \u2192 Extract \u2192 Store",
    description:
      "Blood test PDFs are uploaded to R2, converted to markdown by LlamaParse, parsed through a 3-tier cascade (HTML table, FormKeysValues, free-text), then embedded with text-embedding-3-large at 1024 dimensions and stored in Neon PostgreSQL.",
    tags: ["Cloudflare R2", "LlamaParse", "3-tier cascade", "1024-dim vectors"],
    Flow: IngestionFlow,
  },
  {
    id: "pipeline",
    num: "02",
    icon: Brain,
    iconColor: "var(--indigo-9)",
    iconBg: "var(--indigo-a3)",
    title: "LangGraph StateGraph Pipeline",
    brief: "Triage \u2192 Retrieve \u2192 Synthesize \u2192 Guard",
    description:
      "Every chat query flows through 4 typed nodes: triage classifies intent into 8 categories, retrieve routes to the right pgvector tables, synthesize generates a clinical answer, and guard audits for safety.",
    tags: ["LangGraph", "DeepSeek R1", "4-node graph", "typed state"],
    Flow: PipelineFlow,
  },
  {
    id: "retrieval",
    num: "03",
    icon: Search,
    iconColor: "var(--blue-9)",
    iconBg: "var(--blue-a3)",
    title: "Intent-Based Retrieval Routing",
    brief: "8 intents \u2192 strategy routing \u2192 pgvector search",
    description:
      "The retrieve node dispatches to different pgvector search strategies based on triage intent. Marker and trajectory queries run hybrid search \u2014 a CTE that computes both ts_rank on a tsvector index and cosine similarity via pgvector\u2019s <=> operator, then combines them as 0.7 \u00d7 vector + 0.3 \u00d7 normalized FTS into a single ranked score (k=10 markers + k=3 test-level context). Trajectory queries extend this by joining blood_marker_embeddings \u2192 blood_markers \u2192 blood_tests to pull the raw value, unit, flag, and test_date for each extracted entity (up to k=50 per marker name), giving the synthesizer a time-ordered series for velocity analysis. Conditions, medications, and symptoms each search their own embedding table first (k=5), then cross-reference with hybrid marker search (k=5) to surface drug\u2013biomarker interactions or symptom\u2013lab correlations. Appointments query only appointment_embeddings (k=5). General-health fans out to all 5 sources simultaneously \u2014 tests(3) + markers(5) + conditions(3) + medications(3) + symptoms(3) = 17 chunks \u2014 assembling a broad context window. Safety-refusal skips retrieval entirely, returning empty context so the synthesizer emits a hardcoded clinical disclaimer instead of calling the LLM.",
    tags: [
      "Hybrid search",
      "0.7 cosine + 0.3 FTS CTE",
      "7 entity tables",
      "k=50 trend join",
      "safety bypass",
    ],
    Flow: RetrievalFlow,
  },
  {
    id: "safety-guard",
    num: "04",
    icon: ShieldCheck,
    iconColor: "var(--crimson-9)",
    iconBg: "var(--crimson-a3)",
    title: "Safety Guard Audit",
    brief: "5 rules \u2192 audit \u2192 pass / disclaimer",
    description:
      "Every synthesised response passes through a DeepSeek auditor checking 5 rules: no diagnosis, no prescription, physician referral required, no PII leakage, no hallucination. Failed responses get disclaimers appended.",
    tags: [
      "DeepSeek auditor",
      "5 safety rules",
      "PII check",
      "disclaimer injection",
    ],
    Flow: GuardFlow,
  },
  {
    id: "embedding",
    num: "05",
    icon: Layers,
    iconColor: "var(--amber-9)",
    iconBg: "var(--amber-a3)",
    title: "Multi-Entity Embedding Strategy",
    brief: "7 types \u2192 format \u2192 embed \u2192 pgvector",
    description:
      "Seven entity types (tests, markers, health state, conditions, medications, symptoms, appointments) each have a dedicated format_*_for_embedding() function that converts structured data into deterministic clinical text. Two ingestion paths feed the pipeline: blood data flows through a LlamaIndex IngestionPipeline with a custom BloodTestNodeParser that produces 3 node types per test (test-level, per-marker, health-state with 7 derived ratios), while user-entered entities hit POST /embed/* routes that format, embed, and upsert in one call. All text is embedded via OpenAI\u2019s text-embedding-3-large at 1024 dimensions (Matryoshka truncation from native 3072-dim) and stored in 7 paired pgvector tables with ON CONFLICT upsert for idempotency. Vector searches use sequential scan scoped by BTREE-indexed user_id \u2014 exact cosine distance at per-user scale, no approximate indexes needed.",
    tags: ["7 entity types", "text-embedding-3-large 1024d", "dual ingestion paths", "ON CONFLICT upsert", "pgvector"],
    Flow: EmbeddingFlow,
  },
];

const techCategories = [
  {
    category: "Frontend",
    color: "var(--blue-9)",
    items: ["Next.js 15", "Radix UI", "Panda CSS"],
  },
  {
    category: "Database",
    color: "var(--green-9)",
    items: ["Neon PostgreSQL", "Drizzle ORM", "pgvector + BTREE"],
  },
  {
    category: "AI / ML",
    color: "var(--amber-9)",
    items: ["DeepSeek R1", "text-embedding-3-large", "LlamaParse"],
  },
  {
    category: "Infrastructure",
    color: "var(--cyan-9)",
    items: ["Vercel", "Cloudflare R2", "Turbopack"],
  },
  {
    category: "Evaluation",
    color: "var(--pink-9)",
    items: ["DeepEval", "RAGAS"],
  },
];

const pgReasons = [
  {
    icon: Database,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    title: "Single-Engine Architecture",
    description:
      "Relational data, 1024-dim vectors, and full-text search live in one database. No Pinecone, no Weaviate, no API orchestration between services — one connection string handles everything.",
    detail:
      "blood_tests, conditions, medications, symptoms, appointments, and 7 embedding tables all share the same Neon PostgreSQL instance with cascade deletes and foreign key integrity.",
  },
  {
    icon: Combine,
    color: "var(--blue-9)",
    bg: "var(--blue-a3)",
    title: "Hybrid Search in a Single Query",
    description:
      "30% full-text search via ts_rank() + 70% cosine similarity via pgvector's <=> operator, computed in one SQL statement. No round-trips between services.",
    sql: `SELECT marker_name, content,
  0.3 * ts_rank(to_tsvector('english', content),
                 plainto_tsquery('english', $1))
+ 0.7 * (1 - (embedding <=> $2))
  AS combined_score
FROM blood_marker_embeddings
WHERE user_id = $3
ORDER BY combined_score DESC
LIMIT 5;`,
  },
  {
    icon: BarChart3,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    title: "JSONB for Derived Metrics",
    description:
      "7 clinical ratios — HDL/LDL, TC/HDL, TG/HDL, TyG Index, NLR, BUN/Creatinine, De Ritis — are computed per blood test and stored as structured JSONB in health_state_embeddings.derived_metrics, alongside a 1024-dim pgvector embedding in the same row. One row serves two query paradigms: the vector column enables semantic similarity search via <=>, while the JSONB column enables exact filtering, GIN-indexed lookups, and per-key extraction via ->> — no ETL pipeline between them.",
    detail:
      "Adding a new ratio (e.g., ApoB/ApoA1 or Calcium/Albumin) requires only a Python dict entry in METRIC_REFERENCES and a line in compute_derived_metrics — no ALTER TABLE, no migration, no reindex. The JSONB column absorbs new keys transparently, and downstream consumers (trajectory velocity, risk classification, LLM context) pick them up automatically because they iterate over all keys in the payload.",
    sql: `-- Filter tests with elevated triglyceride/HDL ratio
-- JSONB ->> extracts the value; no application-side parsing
SELECT t.test_date,
  (e.derived_metrics ->> 'triglyceride_hdl_ratio')::float AS tg_hdl,
  (e.derived_metrics ->> 'ast_alt_ratio')::float          AS de_ritis
FROM health_state_embeddings e
JOIN blood_tests t ON t.id = e.test_id
WHERE e.user_id = $1
  AND (e.derived_metrics ->> 'triglyceride_hdl_ratio')::float > 3.5
ORDER BY t.test_date DESC;`,
  },
  {
    icon: Zap,
    color: "var(--indigo-9)",
    bg: "var(--indigo-a3)",
    title: "Trajectory via Cosine Distance",
    description:
      "A 5-stage pipeline turns sequential blood panels into a longitudinal health trajectory. Stage 1: a SQL CTE computes cosine similarity between the latest 1024-dim health-state embedding and every prior test — inside the database via pgvector's <=> operator, not in application code. Stage 2: 7 derived clinical ratios (TG/HDL, NLR, TyG Index, De Ritis, etc.) are classified against peer-reviewed thresholds into optimal / borderline / elevated tiers. Stage 3: velocity (rate of change per day) is computed between consecutive panels following longitudinal biomarker analysis approaches (Lacher DA et al. Clin Chem 2005). Stage 4: similarity values near 1.0 indicate health stability; drift toward 0.0 flags divergence that may warrant clinical follow-up. Stage 5: Qwen 2.5 at temperature 0.3 synthesizes direction (improving / stable / deteriorating) with citations to the source clinical papers.",
    detail:
      "Each health-state embedding packs a 1024-dim vector alongside a JSONB derived_metrics payload (HDL/LDL per Castelli 1996, TC/HDL per Millán 2009, TG/HDL per McLaughlin 2003, TyG per Simental-Mendía 2008, NLR per Forget 2017, BUN/Creatinine per Hosten 1990, De Ritis per De Ritis 1957). The CTE uses a NULL guard so single-test users get a trajectory row without a similarity score. Velocity computation clamps daysBetween to min 1 to avoid division by zero for same-day tests. The entire flow — from pgvector distance to LLM synthesis — runs without any external vector database: one Neon PostgreSQL connection string handles relational joins, JSONB queries, and cosine similarity.",
    sql: `-- Stage 1: Cosine similarity via CTE (runs in PostgreSQL)
WITH latest AS (
  SELECT embedding
  FROM health_state_embeddings
  WHERE user_id = $1
  ORDER BY created_at DESC LIMIT 1
)
SELECT
  e.id, e.test_id, e.derived_metrics, t.test_date,
  CASE WHEN (SELECT embedding FROM latest) IS NOT NULL
    THEN 1 - (e.embedding <=> (SELECT embedding FROM latest))
    ELSE NULL
  END AS similarity_to_latest
FROM health_state_embeddings e
JOIN blood_tests t ON t.id = e.test_id
WHERE e.user_id = $1
ORDER BY COALESCE(t.test_date::timestamptz, e.created_at) ASC;

-- Stage 3: Velocity (runs in TypeScript)
-- velocity[key] = (curr[key] - prev[key]) / daysBetween
-- daysBetween = max(1, round((currDate - prevDate) / 86400000))`,
  },
  {
    icon: Lock,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    title: "Row-Level User Isolation",
    description:
      "All 22 tables — 10 domain tables, 7 embedding tables, and 5 supporting tables — carry a user_id column with a dedicated B-tree index. Every query, including vector similarity searches, is scoped to the authenticated user via WHERE user_id = $1 so the query planner prunes the search space before scanning a single vector. No row from one user can ever leak into another user's results, and the B-tree filter runs before the expensive pgvector distance calculation.",
    detail:
      "CASCADE DELETE on foreign keys creates automatic cleanup chains: deleting a user removes all their blood tests, which cascades to blood_markers, blood_marker_embeddings, blood_test_embeddings, and health_state_embeddings. The same applies to conditions → condition_embeddings → condition_researches, medications → medication_embeddings, symptoms → symptom_embeddings, and appointments → appointment_embeddings. No orphaned vectors, no background cleanup jobs, no stale embeddings from deleted records. Junction tables like family_member_doctors also cascade from both sides — deleting either the family member or the doctor removes the link row.",
    sql: `-- Isolation: every vector search is user-scoped
SELECT content, 1 - (embedding <=> $2) AS score
FROM blood_marker_embeddings
WHERE user_id = $1          -- B-tree index prunes first
ORDER BY embedding <=> $2
LIMIT 5;

-- Cascade chain: DELETE user → blood_tests
--   → blood_markers → blood_marker_embeddings
--   → blood_test_embeddings
--   → health_state_embeddings
-- All removed in a single transaction.`,
  },
  {
    icon: GitMerge,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    title: "Neon Branching for Dev/Test",
    description:
      "Neon's copy-on-write branching lets you fork the production database in milliseconds. Test migrations, evaluate embedding changes, or run RAGAS benchmarks against real data without touching prod.",
    detail:
      "Serverless auto-scaling means zero cold-start overhead. The database scales to zero when idle and wakes in ~150ms on first query.",
  },
  {
    icon: Server,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    title: "Drizzle ORM Type Safety",
    description:
      "A custom Drizzle type maps vector(1024) to number[] in TypeScript. Schema changes generate SQL migrations, and every query is fully type-checked at compile time.",
    sql: `const vector = customType<{
  data: number[];
  driverParam: string;
}>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value: number[]) {
    return \`[\${value.join(",")}]\`;
  },
  fromDriver(value: string) {
    return value.slice(1, -1)
      .split(",").map(Number);
  },
});`,
  },
];

const intents = [
  {
    name: "markers",
    icon: Search,
    color: "var(--blue-9)",
    bg: "var(--blue-a3)",
    description: "Blood marker values, levels, reference ranges, flags. The primary search path for specific lab questions.",
    strategy: "Hybrid CTE: ts_rank on tsvector + cosine via <=> operator, combined as 0.7\u00d7vector + 0.3\u00d7FTS. Also pulls k=3 test-level context for file/date provenance.",
    k: "10 + 3",
    example: "What is my cholesterol level?",
  },
  {
    name: "trajectory",
    icon: TrendingUp,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    description: "Trends over time, velocity, improving/deteriorating patterns. Extends hybrid search with temporal joins.",
    strategy: "Hybrid markers + blood tests, then per extracted entity: joins marker_embeddings \u2192 blood_markers \u2192 blood_tests to get value, unit, flag, test_date for time-ordered series.",
    k: "10 + 3 + 50/entity",
    example: "Is my iron improving?",
  },
  {
    name: "conditions",
    icon: Heart,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    description: "Health conditions, diseases, chronic issues. Cross-references with markers to surface condition\u2013lab correlations.",
    strategy: "Pure cosine on condition_embeddings (k=5), then hybrid marker search (k=5) for lab cross-reference.",
    k: "5 + 5",
    example: "Tell me about my thyroid condition",
  },
  {
    name: "medications",
    icon: Pill,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    description: "Drugs, dosages, interactions. Cross-references with markers to detect drug\u2013biomarker effects.",
    strategy: "Pure cosine on medication_embeddings (k=5), then hybrid marker search (k=5) for interaction detection.",
    k: "5 + 5",
    example: "What medications interact with my markers?",
  },
  {
    name: "symptoms",
    icon: Activity,
    color: "var(--pink-9)",
    bg: "var(--pink-a3)",
    description: "Symptoms and their relation to lab markers. Links reported symptoms to abnormal marker patterns.",
    strategy: "Pure cosine on symptom_embeddings (k=5), then hybrid marker search (k=5) for symptom\u2013lab mapping.",
    k: "5 + 5",
    example: "Could my fatigue be related to my labs?",
  },
  {
    name: "appointments",
    icon: Calendar,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    description: "Scheduling, upcoming visits, provider details. Single-table search with no cross-reference.",
    strategy: "Pure cosine on appointment_embeddings only. No marker cross-reference needed.",
    k: "5",
    example: "When is my next blood draw?",
  },
  {
    name: "general_health",
    icon: Layers,
    color: "var(--indigo-9)",
    bg: "var(--indigo-a3)",
    description: "Broad questions spanning multiple domains (metabolic syndrome, overall summary). Fans out to all entity tables simultaneously.",
    strategy: "Parallel fan-out: tests(3) + hybrid markers(5) + conditions(3) + medications(3) + symptoms(3). Assembles a wide context window.",
    k: "17 total",
    example: "Give me an overall health summary",
  },
  {
    name: "safety_refusal",
    icon: ShieldCheck,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    description: "Diagnosis requests, treatment prescriptions, out-of-scope topics. Skips retrieval and LLM entirely.",
    strategy: "No retrieval, no LLM call. Returns hardcoded clinical disclaimer. Guard node auto-passes.",
    k: "0",
    example: "Do I have diabetes?",
  },
];

const clinicalRatios = [
  {
    name: "TG/HDL Ratio",
    formula: "Triglycerides / HDL",
    icon: Activity,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    optimal: "< 2.0",
    borderline: "2.0 – 3.5",
    elevated: "> 3.5",
    significance: "Insulin resistance surrogate — correlates with small dense LDL particle count",
    source: "McLaughlin et al.",
  },
  {
    name: "TC/HDL Ratio",
    formula: "Total Cholesterol / HDL",
    icon: Heart,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    optimal: "< 4.0",
    borderline: "4.0 – 5.0",
    elevated: "> 5.0",
    significance: "Cardiovascular risk index — better predictor than LDL alone",
    source: "Castelli et al.",
  },
  {
    name: "HDL/LDL Ratio",
    formula: "HDL / LDL",
    icon: BarChart3,
    color: "var(--blue-9)",
    bg: "var(--blue-a3)",
    optimal: "> 0.4",
    borderline: "0.3 – 0.4",
    elevated: "< 0.3",
    significance: "Atherogenic risk — inversely tracks plaque progression",
    source: "Millán et al.",
  },
  {
    name: "NLR",
    formula: "Neutrophils / Lymphocytes",
    icon: FlaskConical,
    color: "var(--orange-9)",
    bg: "var(--orange-a3)",
    optimal: "1.0 – 3.0",
    borderline: "3.0 – 5.0",
    elevated: "> 5.0",
    significance: "Systemic inflammation index — elevated in infection, stress, malignancy",
    source: "Fest et al.",
  },
  {
    name: "De Ritis Ratio",
    formula: "AST / ALT",
    icon: Database,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    optimal: "0.8 – 1.5",
    borderline: "1.5 – 2.0",
    elevated: "> 2.0",
    significance: "Liver damage differentiation — high values suggest alcoholic or cardiac origin",
    source: "De Ritis et al.",
  },
  {
    name: "BUN/Creatinine",
    formula: "BUN / Creatinine",
    icon: Zap,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    optimal: "10 – 20",
    borderline: "20 – 25",
    elevated: "> 25",
    significance: "Renal function — distinguishes pre-renal from intrinsic kidney injury",
    source: "Hosten et al.",
  },
  {
    name: "TyG Index",
    formula: "log(TG × Glucose × 0.5)",
    icon: Combine,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    optimal: "< 8.5",
    borderline: "8.5 – 9.0",
    elevated: "> 9.0",
    significance: "Metabolic syndrome predictor — validated against HOMA-IR gold standard",
    source: "Simental-Mendía et al.",
  },
];

const guardRules = [
  {
    rule: "DIAGNOSIS",
    icon: Cpu,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    check: 'Does the response say "you have X" or diagnose a condition?',
    action: 'Appends: "This information is for educational purposes only and is not a medical diagnosis."',
  },
  {
    rule: "PRESCRIPTION",
    icon: Pill,
    color: "var(--orange-9)",
    bg: "var(--orange-a3)",
    check: "Does the response prescribe specific medications or dosages?",
    action: 'Appends: "I cannot recommend specific medications or dosages. Consult your physician."',
  },
  {
    rule: "PHYSICIAN_REFERRAL",
    icon: ShieldCheck,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    check: "Does the response include a healthcare professional reminder?",
    action: 'Appends: "Please consult your physician before making medical decisions."',
  },
  {
    rule: "PII_LEAKAGE",
    icon: Eye,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    check: "Does the response contain personally identifiable information?",
    action: "Flags response for PII redaction before delivery.",
  },
  {
    rule: "HALLUCINATION",
    icon: AlertTriangle,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    check: "Does the response claim facts NOT present in the retrieved context?",
    action: "Flags unsupported claims and strips ungrounded statements.",
  },
];

const extractionTiers = [
  {
    tier: "1",
    title: "HTML Tables",
    icon: Server,
    color: "var(--orange-9)",
    bg: "var(--orange-a3)",
    description:
      "LlamaParse converts PDF tables into HTML. Regex extracts rows via <tr>/<td> patterns, yielding structured [name, value, unit, reference_range] tuples.",
    pattern: String.raw`<tr[^>]*>([\s\S]*?)</tr>  →  <t[dh][^>]*>([\s\S]*?)</t[dh]>`,
    validation: "Value must contain a digit; name must not start with a digit.",
  },
  {
    tier: "2",
    title: "FormKeysValues",
    icon: Database,
    color: "var(--blue-9)",
    bg: "var(--blue-a3)",
    description:
      'Handles Romanian/EU lab formats where a "Title" element is followed by key-value pairs. Extracts value+unit via numeric regex, reference range from the last parenthesized substring.',
    pattern: String.raw`([\d.,]+)\s*([\w/µ%µgLdlUIuimlog]+)  →  \(([^)]+)\)`,
    validation:
      "Skips administrative rows (RECOLTAT, LUCRAT, CNP, ADRESA, etc.)",
  },
  {
    tier: "3",
    title: "Free-Text Fallback",
    icon: Search,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    description:
      "When no tables or key-value pairs exist, a 4-group multiline regex captures name, value, unit, and reference range from whitespace-separated columns in plain text.",
    pattern: String.raw`^([A-Za-z\u00C0-\u00FF...]+?)\s{2,}([\d.,]+)\s+(unit)\s+(range)`,
    validation:
      "Deduplication by marker name keeps first occurrence; flags computed from parsed ranges.",
  },
];

const flagRules = [
  { condition: "Range (lo – hi)", logic: "num < lo → low · num > hi → high · else → normal" },
  { condition: "Less-than (< X)", logic: "num ≥ X → high · else → normal" },
  { condition: "Greater-than (> X)", logic: "num ≤ X → low · else → normal" },
  { condition: "Undetectable", logic: "num > 0 → high · else → normal" },
];

const embeddingFormats = [
  {
    entity: "Blood Marker",
    icon: FlaskConical,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    runtime: "Python",
    template: "Marker: {name}\\nValue: {value} {unit}\\nReference range: {range}\\nFlag: {flag}\\nTest: {fileName}\\nDate: {testDate}",
  },
  {
    entity: "Health State",
    icon: Activity,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    runtime: "Python",
    template: "Health state: {fileName}\\nDate: {uploadedAt}\\nTotal markers: {count}\\nSummary: {summary}\\n\\nDerived metrics (with risk):\\n{metrics}\\n\\nAll markers:\\n{markers}",
  },
  {
    entity: "Blood Test",
    icon: Upload,
    color: "var(--orange-9)",
    bg: "var(--orange-a3)",
    runtime: "Python",
    template: "Blood test: {fileName}\\nDate: {uploadedAt}\\nSummary: {summary}\\n\\n{marker_lines}",
  },
  {
    entity: "Condition",
    icon: Heart,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    runtime: "TypeScript",
    template: "Health condition: {name}\\nNotes: {notes}",
  },
  {
    entity: "Medication",
    icon: Pill,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    runtime: "TypeScript",
    template: "Medication: {name}\\nDosage: {dosage}\\nFrequency: {frequency}\\nNotes: {notes}",
  },
  {
    entity: "Symptom",
    icon: Activity,
    color: "var(--pink-9)",
    bg: "var(--pink-a3)",
    runtime: "TypeScript",
    template: "Symptom: {description}\\nSeverity: {severity}\\nDate: {loggedAt}",
  },
  {
    entity: "Appointment",
    icon: Calendar,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    runtime: "TypeScript",
    template: "Appointment: {title}\\nProvider: {provider}\\nDate: {date}\\nNotes: {notes}",
  },
];

const synthesisRules = [
  {
    num: "1",
    rule: "Answer ONLY from context",
    detail: "If the retrieved chunks don't contain relevant information, say so clearly instead of guessing.",
    color: "var(--blue-9)",
  },
  {
    num: "2",
    rule: "Cite marker values and ranges",
    detail: "Always reference the specific numeric value and its reference range when discussing a biomarker.",
    color: "var(--green-9)",
  },
  {
    num: "3",
    rule: "Cite peer-reviewed thresholds",
    detail: "For derived ratios, include the paper author and threshold (e.g., McLaughlin: TG/HDL > 3.5 = elevated).",
    color: "var(--amber-9)",
  },
  {
    num: "4",
    rule: "NEVER diagnose",
    detail: 'Describe what the data shows and note associations — never say "you have X."',
    color: "var(--crimson-9)",
  },
  {
    num: "5",
    rule: "NEVER prescribe",
    detail: "Do not recommend specific medications, dosages, or treatment protocols.",
    color: "var(--crimson-9)",
  },
  {
    num: "6",
    rule: "ALWAYS remind to consult physician",
    detail: "Every answer must include a physician-consultation reminder for medical decisions.",
    color: "var(--indigo-9)",
  },
  {
    num: "7",
    rule: "Trajectory uses clinical semantics",
    detail: "Rising HDL = improving. Rising TG/HDL = deteriorating. Describe direction, not just numbers.",
    color: "var(--violet-9)",
  },
];

const bridgeEndpoints = [
  {
    method: "POST",
    path: "/upload",
    description: "PDF → R2 storage → LlamaParse → marker extraction → embeddings",
    input: "FormData: file, user_id, test_date",
    output: "{test_id, markers_count, status}",
    color: "var(--orange-9)",
  },
  {
    method: "POST",
    path: "/search/markers",
    description: "Hybrid search: 0.7 cosine + 0.3 FTS on blood_marker_embeddings",
    input: "{query, user_id}",
    output: "{marker_name, combined_score, fts_rank, vector_similarity}[]",
    color: "var(--blue-9)",
  },
  {
    method: "POST",
    path: "/search/multi",
    description: "Fan-out across all 7 entity tables, returns combined results",
    input: "{query, user_id}",
    output: "{tests[], markers[], conditions[], medications[], symptoms[], appointments[]}",
    color: "var(--indigo-9)",
  },
  {
    method: "POST",
    path: "/search/trend",
    description: "All historical values for a specific marker — joins markers → tests for dates",
    input: "{query, user_id, marker_name?}",
    output: "{value, unit, flag, test_date, file_name, similarity}[]",
    color: "var(--green-9)",
  },
  {
    method: "POST",
    path: "/chat",
    description: "Full LangGraph pipeline: triage → retrieve → synthesize → guard",
    input: "{messages[], user_id}",
    output: "{answer, intent, guard_passed, guard_issues, citations, retrieval_sources}",
    color: "var(--crimson-9)",
  },
  {
    method: "DELETE",
    path: "/blood-tests/{id}",
    description: "Cascade delete: test + markers + all embedding rows",
    input: "query: user_id",
    output: "{deleted: bool}",
    color: "var(--gray-9)",
  },
];

const contextSteps = [
  {
    step: "1",
    title: "Chunk Collection",
    description: "Retrieve node appends content strings from each search result to context_chunks[], tracking source table names in retrieval_sources[] and similarity scores in retrieval_scores[].",
    color: "var(--blue-9)",
  },
  {
    step: "2",
    title: "Context Block",
    description: 'Chunks are joined with "\\n\\n---\\n\\n" separators. Header line shows chunk count and unique source tables.',
    code: 'RETRIEVED CONTEXT (7 chunks from blood_marker_embeddings, blood_test_embeddings):\n\n{chunk_1}\n\n---\n\n{chunk_2}\n\n---\n\n...',
    color: "var(--indigo-9)",
  },
  {
    step: "3",
    title: "History Window",
    description: "Chat history is sliced to the last 6 items (3 user + assistant turn pairs) to keep the context window manageable.",
    code: "CONVERSATION HISTORY:\nuser: What is my TG/HDL ratio?\nassistant: Your TG/HDL ratio is 2.8...\nuser: Is that improving?",
    color: "var(--green-9)",
  },
  {
    step: "4",
    title: "Prompt Assembly",
    description: "Context + history + query are joined with double newlines and sent to DeepSeek with temperature 0.1.",
    code: "[RETRIEVED CONTEXT]\n\n[CONVERSATION HISTORY]\n\nQUERY: Is my iron improving?",
    color: "var(--amber-9)",
  },
  {
    step: "5",
    title: "Citation Extraction",
    description: "After generation, a regex scans the answer for 12 clinical author names, extracting full citation sentences.",
    code: "/(Castelli|Millán|McLaughlin|Simental-Mendía|Forget|Hosten|De Ritis|Giannini|Fest|Botros|Inker|Gonzalez-Chavez)[^.]*/",
    color: "var(--violet-9)",
  },
];

const evalMetrics = [
  { name: "Answer Relevancy", threshold: "0.7", description: "Is the answer relevant to the question asked?", icon: CheckCircle2, color: "var(--green-9)" },
  { name: "Faithfulness", threshold: "0.7", description: "Are all claims grounded in the retrieved context?", icon: ShieldCheck, color: "var(--blue-9)" },
  { name: "Contextual Precision", threshold: "0.7", description: "Are the most relevant chunks ranked highest?", icon: Gauge, color: "var(--amber-9)" },
  { name: "Contextual Recall", threshold: "0.7", description: "Are all necessary facts retrieved from the store?", icon: Search, color: "var(--indigo-9)" },
  { name: "Contextual Relevancy", threshold: "0.7", description: "Is every retrieved chunk actually useful to the answer?", icon: FlaskConical, color: "var(--violet-9)" },
];

const evalScenarios = [
  { name: "lipid-drilldown", turns: 3, description: "TG/HDL → TyG → metabolic syndrome follow-up" },
  { name: "cross-domain-lipid-nlr", turns: 3, description: "Lipid (TC/HDL) → inflammatory (NLR)" },
  { name: "renal-to-hepatic", turns: 3, description: "BUN/Creatinine → De Ritis (liver)" },
  { name: "trajectory-followup", turns: 3, description: "Velocity calculation and interpretation" },
  { name: "medication-interaction", turns: 3, description: "Statins → De Ritis → corticosteroids" },
  { name: "safety-persistence", turns: 3, description: "Repeated diagnosis/prescription requests — must refuse all" },
  { name: "boundary-values", turns: 3, description: "Edge cases: TG/HDL = 2.0, NLR = 3.0 exactly" },
  { name: "lifestyle-factors", turns: 3, description: "Fasting status, exercise effects on markers" },
];

const schemaCategories = [
  {
    category: "Authentication",
    color: "var(--gray-9)",
    count: 4,
    tables: ["user", "session", "account", "verification"],
    detail: "Better Auth with cookie sessions. user_id propagates to all domain tables.",
  },
  {
    category: "Core Domain",
    color: "var(--blue-9)",
    count: 10,
    tables: [
      "bloodTests",
      "bloodMarkers",
      "conditions",
      "medications",
      "symptoms",
      "doctors",
      "appointments",
      "familyMembers",
      "familyMemberDoctors",
      "medicalLetters",
    ],
    detail: "All tables have userId FK → user (CASCADE DELETE). appointments and medicalLetters use SET NULL for optional doctor/family FKs.",
  },
  {
    category: "Embedding",
    color: "var(--green-9)",
    count: 7,
    tables: [
      "bloodTestEmbeddings",
      "bloodMarkerEmbeddings",
      "healthStateEmbeddings",
      "conditionEmbeddings",
      "medicationEmbeddings",
      "symptomEmbeddings",
      "appointmentEmbeddings",
    ],
    detail: "Each has vector(1024), content text, userId index. CASCADE DELETE on source entity — no orphaned vectors.",
  },
  {
    category: "Research",
    color: "var(--amber-9)",
    count: 1,
    tables: ["researches"],
    detail: 'Papers as JSONB array, synthesis text, type enum ("condition" | "protocol" | "memory"). 4 indexes.',
  },
  {
    category: "Brain Health",
    color: "var(--violet-9)",
    count: 6,
    tables: [
      "brainHealthProtocols",
      "protocolSupplements",
      "cognitiveBaselines",
      "cognitiveCheckIns",
      "memoryEntries",
      "memoryBaseline",
    ],
    detail: "Protocol → supplements/baselines/check-ins hierarchy. memoryEntries uses SET NULL for optional protocol FK.",
  },
];

const triageSteps = [
  {
    step: "1",
    title: "LLM Classification",
    color: "var(--indigo-9)",
    description: "User query sent to DeepSeek with the TRIAGE_SYSTEM prompt. Model returns JSON with intent, confidence, and extracted entities.",
  },
  {
    step: "2",
    title: "Markdown Stripping",
    color: "var(--blue-9)",
    description: 'Response cleaned of markdown code fences (```json ... ```) via regex before JSON parsing.',
  },
  {
    step: "3",
    title: "JSON Parse + Fallback",
    color: "var(--amber-9)",
    description: 'On JSONDecodeError: defaults to {intent: "general_health", confidence: 0.5, entities: []}. Never crashes the pipeline.',
  },
  {
    step: "4",
    title: "Intent Validation",
    color: "var(--green-9)",
    description: "Parsed intent checked against the 8-value allow set. Unknown intents silently default to general_health.",
  },
  {
    step: "5",
    title: "Confidence Audit",
    color: "var(--gray-9)",
    description: "Confidence (0.0–1.0) stored in state for logging/audit. Not used for routing — all intents proceed to retrieve except safety_refusal.",
  },
];

const resilienceConfig = [
  {
    label: "Max Retries",
    value: "3",
    detail: "4 total attempts (initial + 3 retries)",
    icon: RefreshCw,
    color: "var(--blue-9)",
  },
  {
    label: "Retry Codes",
    value: "429 · 502 · 503 · 504",
    detail: "Rate limit, bad gateway, service unavailable, gateway timeout",
    icon: Wifi,
    color: "var(--crimson-9)",
  },
  {
    label: "Backoff",
    value: "2s → 4s → 8s",
    detail: "Exponential: 2^(attempt+1) seconds",
    icon: Timer,
    color: "var(--amber-9)",
  },
  {
    label: "Connect Timeout",
    value: "5.0s",
    detail: "Fail fast on unreachable host",
    icon: Wifi,
    color: "var(--green-9)",
  },
  {
    label: "Read Timeout",
    value: "120.0s",
    detail: "Long reads for complex generation",
    icon: Timer,
    color: "var(--indigo-9)",
  },
  {
    label: "Client Pattern",
    value: "Singleton",
    detail: "Lazy init, global reuse — sync + async variants",
    icon: KeyRound,
    color: "var(--violet-9)",
  },
];

const authLayers = [
  {
    layer: "Session Store",
    icon: Fingerprint,
    color: "var(--green-9)",
    detail: "Sessions persisted in PostgreSQL with token, expiry, IP address, and user agent. Cascade delete on user removal.",
    tables: "user → session → account → verification",
  },
  {
    layer: "OAuth Providers",
    icon: Globe,
    color: "var(--blue-9)",
    detail: "Multi-provider via Better Auth account table: access_token, refresh_token, id_token, scope, and automatic token expiry tracking.",
    tables: "account.provider_id + account.account_id",
  },
  {
    layer: "Server Guard",
    icon: UserCheck,
    color: "var(--indigo-9)",
    detail: "withAuth() validates session via auth.api.getSession({ headers }). Returns userId or redirects to /auth/login. Used by every server action.",
    tables: "session.token → user.id",
  },
  {
    layer: "Row Isolation",
    icon: Lock,
    color: "var(--crimson-9)",
    detail: "Every table has user_id with B-tree index. All queries scoped to authenticated user. CASCADE DELETE from user → blood_tests → markers → embeddings.",
    tables: "22 tables · 22 user_id indexes",
  },
];

const trajectoryPipeline = [
  {
    step: "1",
    title: "CTE: Latest Embedding",
    color: "var(--indigo-9)",
    description: "A SQL CTE fetches the most recent health_state_embedding for the user. This becomes the reference point for cosine similarity.",
    code: "SELECT embedding FROM health_state_embeddings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
  },
  {
    step: "2",
    title: "Cosine Similarity",
    color: "var(--blue-9)",
    description: "For every prior state, compute 1 - (embedding <=> latest) to get similarity. Values near 1.0 = stable, near 0.0 = diverged.",
    code: "1 - (e.embedding <=> (SELECT embedding FROM latest)) AS similarity_to_latest",
  },
  {
    step: "3",
    title: "Velocity Computation",
    color: "var(--amber-9)",
    description: "TypeScript computes rate-of-change per day between consecutive states. Minimum 1-day gap. Null metrics filtered out.",
    code: "(current_metric - previous_metric) / days_between",
  },
  {
    step: "4",
    title: "Risk Classification",
    color: "var(--green-9)",
    description: "Each derived metric at each time point classified as optimal/borderline/elevated using METRIC_REFERENCES thresholds.",
    code: "classifyMetricRisk(key, value) → optimal | borderline | elevated | low",
  },
  {
    step: "5",
    title: "LLM Trajectory Analysis",
    color: "var(--violet-9)",
    description: "Qwen (temperature 0.3) analyzes direction: improving, stable, or deteriorating. Cites Castelli, McLaughlin, De Ritis by name.",
    code: "qwen.chat({ model: 'qwen-plus', temperature: 0.3, max_completion_tokens: 1500 })",
  },
];

const markerAliases = [
  { base: "hdl", aliases: ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"], color: "var(--blue-9)" },
  { base: "ldl", aliases: ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"], color: "var(--crimson-9)" },
  { base: "total_cholesterol", aliases: ["total cholesterol", "cholesterol total", "cholesterol"], color: "var(--amber-9)" },
  { base: "triglycerides", aliases: ["triglycerides", "triglyceride", "trig"], color: "var(--orange-9)" },
  { base: "glucose", aliases: ["glucose", "fasting glucose", "blood glucose"], color: "var(--green-9)" },
  { base: "neutrophils", aliases: ["neutrophils", "neutrophil", "neutrophil count", "neut"], color: "var(--pink-9)" },
  { base: "lymphocytes", aliases: ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"], color: "var(--violet-9)" },
  { base: "bun", aliases: ["bun", "blood urea nitrogen", "urea nitrogen"], color: "var(--cyan-9)" },
  { base: "creatinine", aliases: ["creatinine", "creat"], color: "var(--indigo-9)" },
  { base: "ast", aliases: ["ast", "aspartate aminotransferase", "sgot"], color: "var(--green-9)" },
  { base: "alt", aliases: ["alt", "alanine aminotransferase", "sgpt"], color: "var(--amber-9)" },
];

const cognitiveTargetAreas = [
  { area: "MEMORY", icon: BrainCircuit, color: "var(--indigo-9)", description: "Short-term, long-term, working memory capacity" },
  { area: "FOCUS", icon: ScanSearch, color: "var(--blue-9)", description: "Sustained attention and concentration" },
  { area: "PROCESSING_SPEED", icon: Zap, color: "var(--amber-9)", description: "Cognitive processing and reaction time" },
  { area: "NEUROPLASTICITY", icon: Network, color: "var(--green-9)", description: "Neural pathway formation and adaptation" },
  { area: "NEUROPROTECTION", icon: ShieldCheck, color: "var(--crimson-9)", description: "Protection against cognitive decline" },
  { area: "MOOD_REGULATION", icon: Heart, color: "var(--pink-9)", description: "Emotional stability and stress response" },
  { area: "SLEEP_QUALITY", icon: Activity, color: "var(--violet-9)", description: "Sleep architecture and restorative cycles" },
];

const cognitiveScoreDimensions = [
  { dimension: "memoryScore", label: "Memory", description: "Short-term + long-term recall" },
  { dimension: "focusScore", label: "Focus", description: "Sustained attention span" },
  { dimension: "processingSpeedScore", label: "Processing Speed", description: "Cognitive reaction time" },
  { dimension: "moodScore", label: "Mood", description: "Emotional regulation" },
  { dimension: "sleepScore", label: "Sleep", description: "Sleep quality (0–10 scale)" },
];

const entityRelationships = [
  { from: "user", to: "blood_tests", type: "1:N", cascade: "CASCADE DELETE", color: "var(--blue-9)" },
  { from: "blood_tests", to: "blood_markers", type: "1:N", cascade: "CASCADE DELETE", color: "var(--blue-9)" },
  { from: "blood_tests", to: "blood_test_embeddings", type: "1:1", cascade: "CASCADE + UNIQUE", color: "var(--amber-9)" },
  { from: "blood_markers", to: "blood_marker_embeddings", type: "1:1", cascade: "CASCADE + UNIQUE", color: "var(--amber-9)" },
  { from: "blood_tests", to: "health_state_embeddings", type: "1:1", cascade: "CASCADE + UNIQUE", color: "var(--green-9)" },
  { from: "user", to: "conditions", type: "1:N", cascade: "CASCADE DELETE", color: "var(--crimson-9)" },
  { from: "user", to: "medications", type: "1:N", cascade: "CASCADE DELETE", color: "var(--crimson-9)" },
  { from: "user", to: "symptoms", type: "1:N", cascade: "CASCADE DELETE", color: "var(--crimson-9)" },
  { from: "family_members", to: "family_member_doctors", type: "M:N", cascade: "Composite PK", color: "var(--violet-9)" },
  { from: "appointments", to: "doctors", type: "N:1", cascade: "SET NULL", color: "var(--violet-9)" },
  { from: "brain_health_protocols", to: "cognitive_baselines", type: "1:1", cascade: "UNIQUE INDEX", color: "var(--indigo-9)" },
  { from: "user", to: "memory_baseline", type: "1:1", cascade: "UNIQUE INDEX", color: "var(--indigo-9)" },
];

const multiSearchFanOut = [
  { table: "blood_test_embeddings", scoring: "Vector only", threshold: "0.3", limit: "3", color: "var(--blue-9)" },
  { table: "blood_marker_embeddings", scoring: "Hybrid (0.7 cos + 0.3 FTS)", threshold: "0.3", limit: "5", color: "var(--amber-9)" },
  { table: "condition_embeddings", scoring: "Vector only", threshold: "0.3", limit: "5", color: "var(--crimson-9)" },
  { table: "medication_embeddings", scoring: "Vector only", threshold: "0.3", limit: "5", color: "var(--green-9)" },
  { table: "symptom_embeddings", scoring: "Vector only", threshold: "0.3", limit: "5", color: "var(--violet-9)" },
  { table: "appointment_embeddings", scoring: "Vector only", threshold: "0.3", limit: "5", color: "var(--cyan-9)" },
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <Box style={{ minHeight: "100vh" }}>
      {/* Scroll progress bar */}
      <Box className="scroll-progress" />


      {/* ── Header ── */}
      <Box
        asChild
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--gray-a4)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <header>
          <Flex
            justify="between"
            align="center"
            py="3"
            px={{ initial: "4", md: "6", lg: "9" }}
          >
            <Flex align="center" gap="2">
              <Logo size={20} />
              <Heading
                size="4"
                asChild
                style={{ letterSpacing: "-0.02em" }}
              >
                <Link
                  href="/"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Agentic Healthcare
                </Link>
              </Heading>
            </Flex>
            <Flex align="center" gap="5">
              <Flex gap="5" display={{ initial: "none", sm: "flex" }}>
                <Text asChild size="2" color="gray" weight="medium">
                  <Link
                    href="/how-it-works"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    How It Works
                  </Link>
                </Text>
                <Text asChild size="2" color="gray" weight="medium">
                  <Link
                    href="/#features"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    Features
                  </Link>
                </Text>
                <Text asChild size="2" color="gray" weight="medium">
                  <Link
                    href="/#research"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    Research
                  </Link>
                </Text>
              </Flex>
              <a
                href="https://github.com/v9ai/ai-apps"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--gray-a11)", display: "flex" }}
              >
                <Github size={20} />
              </a>
              <Suspense>
                <AuthButton />
              </Suspense>
            </Flex>
          </Flex>
        </header>
      </Box>

      {/* ── Hero ── */}
      <Box className="hiw-hero" py="9">
        <div className="hiw-hero-orb" />
        <Box
          px={{ initial: "4", md: "6", lg: "9" }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <Flex direction="column" align="center" gap="5" py="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--indigo-9)",
                fontSize: "11px",
              }}
            >
              Technical Deep Dive
            </Text>

            <Heading
              size="8"
              align="center"
              style={{
                letterSpacing: "-0.04em",
                lineHeight: 1.15,
                maxWidth: 640,
              }}
            >
              From PDF to{" "}
              <span className="gradient-text">guarded insight</span> in 4 nodes
            </Heading>

            <Text
              size="3"
              color="gray"
              align="center"
              style={{ maxWidth: 520, lineHeight: 1.65 }}
            >
              A LangGraph StateGraph triages every query, retrieves from 7
              entity tables, synthesizes with clinical safety rules, and audits
              the response before it reaches you.
            </Text>

            {/* Enhanced node flow with icons */}
            <Flex
              className="hiw-hero-nodes"
              mt="5"
              wrap="wrap"
              justify="center"
              align="center"
            >
              {heroNodes.map((node, i) => (
                <Fragment key={node.label}>
                  {i > 0 && (
                    <div className="hiw-hero-connector">
                      <div className="hiw-hero-connector-line" />
                    </div>
                  )}
                  <div
                    className="hiw-hero-node"
                    style={
                      { "--node-color": node.color } as React.CSSProperties
                    }
                  >
                    <div
                      className="hiw-hero-node-icon"
                      style={{
                        background: `color-mix(in srgb, ${node.color} 20%, transparent)`,
                        color: node.color,
                      }}
                    >
                      <node.icon size={20} />
                    </div>
                    <span className="hiw-hero-node-label">{node.label}</span>
                    <span className="hiw-hero-node-sub">{node.sub}</span>
                  </div>
                </Fragment>
              ))}
            </Flex>

            <Box className="trajectory-line" mt="3" />

            <Flex className="floating-badges" mt="1">
              <span className="floating-badge">8 intent classes</span>
              <span className="floating-badge">7 entity tables</span>
              <span className="floating-badge">5 safety rules</span>
              <span className="floating-badge">1024-dim vectors</span>
            </Flex>

            {/* Scroll indicator */}
            <Flex
              direction="column"
              align="center"
              mt="5"
              className="scroll-indicator"
            >
              <Text
                size="1"
                style={{
                  color: "var(--gray-8)",
                  letterSpacing: "0.04em",
                  fontSize: "11px",
                }}
              >
                Scroll to explore
              </Text>
              <ChevronDown
                size={16}
                style={{ color: "var(--gray-7)", marginTop: 2 }}
              />
            </Flex>
          </Flex>
        </Box>
      </Box>

      {/* ── Architecture Diagrams ── */}
      <Box py="8" px={{ initial: "4", md: "6", lg: "9" }}>
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Architecture
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 480 }}
            >
              5 interactive views of the data pipeline. Drag nodes to
              rearrange, scroll to zoom.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="6">
          {archSections.map((s, i) => (
            <ScrollReveal key={s.id} delay={i * 60}>
              <section id={s.id} className="arch-section">
                <span className="arch-number">{s.num}</span>
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="3">
                    <div
                      className="arch-icon"
                      style={{
                        background: s.iconBg,
                        color: s.iconColor,
                      }}
                    >
                      <s.icon size={18} />
                    </div>
                    <div>
                      <Heading
                        size="5"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {s.title}
                      </Heading>
                      <Text
                        size="1"
                        style={{
                          color: "var(--gray-9)",
                          fontFamily:
                            "var(--font-mono, 'SF Mono', monospace)",
                          fontSize: "11px",
                        }}
                      >
                        {s.brief}
                      </Text>
                    </div>
                  </Flex>

                  <Text
                    size="2"
                    color="gray"
                    style={{ maxWidth: 800, lineHeight: 1.65 }}
                  >
                    {s.description}
                  </Text>

                  <Flex gap="2" wrap="wrap">
                    {s.tags.map((tag) => (
                      <span key={tag} className="arch-tag">
                        {tag}
                      </span>
                    ))}
                  </Flex>

                  <s.Flow />
                </Flex>
              </section>
            </ScrollReveal>
          ))}
        </Flex>
      </Box>

      {/* ── Tech Stack at a Glance ── */}
      <Box
        id="tech-stack"
        py="8"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="6">
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Tech Stack at a Glance
            </Heading>
            <Text size="2" color="gray" align="center">
              15 technologies from upload to insight
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid columns={{ initial: "2", sm: "3", md: "5" }} gap="4">
          {techCategories.map((cat, i) => (
            <ScrollReveal key={cat.category} delay={i * 80}>
              <Flex
                direction="column"
                gap="2"
                p="4"
                className="tech-stack-card"
              >
                <Text
                  size="1"
                  weight="bold"
                  style={{
                    color: cat.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontSize: "11px",
                  }}
                >
                  {cat.category}
                </Text>
                {cat.items.map((item) => (
                  <Text key={item} size="2" color="gray">
                    {item}
                  </Text>
                ))}
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>
      </Box>

      {/* ── Why PostgreSQL? ── */}
      <Box
        id="why-postgres"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--green-9)",
                fontSize: "11px",
              }}
            >
              Database Deep Dive
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Why PostgreSQL?
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Most health AI platforms bolt a vector database onto their stack.
              We chose to keep everything in PostgreSQL — relational data,
              1024-dim embeddings, full-text search, and clinical metrics — in
              one engine with one transaction model.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="5">
          {pgReasons.map((r, i) => (
            <ScrollReveal key={r.title} delay={i * 60}>
              <section className="arch-section">
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="3">
                    <div
                      className="arch-icon"
                      style={{ background: r.bg, color: r.color }}
                    >
                      <r.icon size={18} />
                    </div>
                    <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
                      {r.title}
                    </Heading>
                  </Flex>

                  <Text
                    size="2"
                    color="gray"
                    style={{ maxWidth: 800, lineHeight: 1.65 }}
                  >
                    {r.description}
                  </Text>

                  {r.detail && (
                    <Text
                      size="2"
                      style={{
                        color: "var(--gray-10)",
                        maxWidth: 800,
                        lineHeight: 1.65,
                        paddingLeft: "1rem",
                        borderLeft: "2px solid var(--gray-a4)",
                      }}
                    >
                      {r.detail}
                    </Text>
                  )}

                  {r.sql && (
                    <pre className="pg-code-block">
                      <code>{r.sql}</code>
                    </pre>
                  )}
                </Flex>
              </section>
            </ScrollReveal>
          ))}
        </Flex>
      </Box>

      {/* ── Intent Classification Matrix ── */}
      <Box
        id="intent-matrix"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--indigo-9)",
                fontSize: "11px",
              }}
            >
              Triage Node
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Intent Classification Matrix
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              DeepSeek classifies every query into one of 8 intent classes.
              Each intent routes to a different retrieval strategy with
              tailored top-k limits.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", sm: "2", lg: "4" }}
          gap="4"
        >
          {intents.map((intent, i) => (
            <ScrollReveal key={intent.name} delay={i * 50}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
              >
                <Flex align="center" gap="3">
                  <div
                    className="deep-dive-icon"
                    style={{ background: intent.bg, color: intent.color }}
                  >
                    <intent.icon size={18} />
                  </div>
                  <Text
                    size="3"
                    weight="bold"
                    style={{
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                      color: intent.color,
                    }}
                  >
                    {intent.name}
                  </Text>
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  style={{ lineHeight: 1.55 }}
                >
                  {intent.description}
                </Text>

                <Text
                  size="1"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "11px",
                    color: "var(--gray-10)",
                    lineHeight: 1.5,
                  }}
                >
                  {intent.strategy}
                </Text>

                <Flex justify="between" align="center">
                  <span className="arch-tag">k = {intent.k}</span>
                  <Text
                    size="1"
                    style={{
                      fontStyle: "italic",
                      color: "var(--gray-9)",
                      fontSize: "11px",
                    }}
                  >
                    &ldquo;{intent.example}&rdquo;
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>
      </Box>

      {/* ── Clinical Ratios Engine ── */}
      <Box
        id="clinical-ratios"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--amber-9)",
                fontSize: "11px",
              }}
            >
              Derived Metrics
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Clinical Ratios Engine
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Every blood test generates 7 derived ratios stored as JSONB
              in health_state_embeddings.derived_metrics. Each ratio is
              classified against peer-reviewed thresholds.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          {clinicalRatios.map((ratio, i) => (
            <ScrollReveal key={ratio.name} delay={i * 60}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
              >
                <Flex align="center" gap="3">
                  <div
                    className="deep-dive-icon"
                    style={{ background: ratio.bg, color: ratio.color }}
                  >
                    <ratio.icon size={18} />
                  </div>
                  <div>
                    <Text
                      size="3"
                      weight="bold"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {ratio.name}
                    </Text>
                    <Text
                      size="1"
                      style={{
                        fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                        fontSize: "11px",
                        color: "var(--gray-9)",
                      }}
                    >
                      {ratio.formula}
                    </Text>
                  </div>
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  style={{ lineHeight: 1.55 }}
                >
                  {ratio.significance}
                </Text>

                <Flex gap="2" wrap="wrap" align="center">
                  <span className="threshold-pill threshold-optimal">
                    {ratio.optimal}
                  </span>
                  <span className="threshold-pill threshold-borderline">
                    {ratio.borderline}
                  </span>
                  <span className="threshold-pill threshold-elevated">
                    {ratio.elevated}
                  </span>
                </Flex>

                <Text
                  size="1"
                  style={{
                    color: "var(--gray-8)",
                    fontSize: "10px",
                    fontStyle: "italic",
                  }}
                >
                  {ratio.source}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>
      </Box>

      {/* ── Guard Safety Protocol ── */}
      <Box
        id="guard-protocol"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--crimson-9)",
                fontSize: "11px",
              }}
            >
              Guard Node
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Safety Guard Protocol
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Every synthesised response passes through a DeepSeek auditor
              that checks 5 rules. Failed responses get disclaimers
              appended — they are never silently dropped.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="4" style={{ maxWidth: 800, margin: "0 auto" }}>
          {guardRules.map((g, i) => (
            <ScrollReveal key={g.rule} delay={i * 60}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
              >
                <Flex align="center" gap="3">
                  <div
                    className="deep-dive-icon"
                    style={{ background: g.bg, color: g.color }}
                  >
                    <g.icon size={18} />
                  </div>
                  <Text
                    size="3"
                    weight="bold"
                    style={{
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                      color: g.color,
                    }}
                  >
                    {g.rule}
                  </Text>
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  style={{ lineHeight: 1.55 }}
                >
                  {g.check}
                </Text>

                <Text
                  size="2"
                  style={{
                    color: "var(--gray-10)",
                    lineHeight: 1.55,
                    paddingLeft: "1rem",
                    borderLeft: `2px solid ${g.color}`,
                  }}
                >
                  {g.action}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={350}>
          <pre className="pg-code-block" style={{ maxWidth: 800, margin: "2rem auto 0" }}>
            <code>{`// Guard audit output schema
{
  "passed": false,
  "issues": ["DIAGNOSIS", "PHYSICIAN_REFERRAL"]
}
// → disclaimer appended for each failed rule
// → safety_refusal intents auto-pass (no retrieval)`}</code>
          </pre>
        </ScrollReveal>
      </Box>

      {/* ── 3-Tier Marker Extraction ── */}
      <Box
        id="marker-extraction"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--orange-9)",
                fontSize: "11px",
              }}
            >
              Ingestion Node
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              3-Tier Marker Extraction
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              BloodTestNodeParser runs a cascading extraction strategy: if
              Tier 1 finds markers, Tiers 2–3 are skipped. Results are
              deduplicated by marker name (first occurrence wins).
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="4" style={{ maxWidth: 800, margin: "0 auto" }}>
          {extractionTiers.map((t, i) => (
            <ScrollReveal key={t.tier} delay={i * 80}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
              >
                <Flex align="center" gap="3">
                  <div className="extraction-tier-badge" style={{ color: t.color, borderColor: t.color }}>
                    {t.tier}
                  </div>
                  <div
                    className="deep-dive-icon"
                    style={{ background: t.bg, color: t.color }}
                  >
                    <t.icon size={18} />
                  </div>
                  <Heading size="4" style={{ letterSpacing: "-0.01em" }}>
                    {t.title}
                  </Heading>
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  style={{ lineHeight: 1.6 }}
                >
                  {t.description}
                </Text>

                <pre className="pg-code-block" style={{ maxWidth: "100%" }}>
                  <code>{t.pattern}</code>
                </pre>

                <Text
                  size="1"
                  style={{
                    color: "var(--gray-9)",
                    fontSize: "11px",
                    fontStyle: "italic",
                  }}
                >
                  {t.validation}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}

          <ScrollReveal delay={280}>
            <Flex
              direction="column"
              gap="3"
              p="4"
              className="deep-dive-card"
            >
              <Flex align="center" gap="3">
                <div
                  className="deep-dive-icon"
                  style={{ background: "var(--green-a3)", color: "var(--green-9)" }}
                >
                  <ShieldCheck size={18} />
                </div>
                <Heading size="4" style={{ letterSpacing: "-0.01em" }}>
                  Flag Computation
                </Heading>
              </Flex>

              <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                After extraction, each marker&apos;s numeric value is compared
                against its parsed reference range to compute a flag.
              </Text>

              <Grid columns={{ initial: "1", sm: "2" }} gap="2">
                {flagRules.map((f) => (
                  <Flex
                    key={f.condition}
                    gap="2"
                    align="baseline"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "var(--gray-a2)",
                    }}
                  >
                    <Text
                      size="1"
                      weight="bold"
                      style={{ fontSize: "11px", color: "var(--gray-11)", whiteSpace: "nowrap" }}
                    >
                      {f.condition}
                    </Text>
                    <Text
                      size="1"
                      style={{
                        fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                        fontSize: "11px",
                        color: "var(--gray-9)",
                      }}
                    >
                      {f.logic}
                    </Text>
                  </Flex>
                ))}
              </Grid>
            </Flex>
          </ScrollReveal>
        </Flex>
      </Box>

      {/* ── Embedding Formatters ── */}
      <Box
        id="embedding-formatters"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--violet-9)",
                fontSize: "11px",
              }}
            >
              Vector Space
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Embedding Formatters
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Each entity type has a dedicated format function that builds a
              deterministic clinical text string before text-embedding-3-large
              encodes it into 1024 dimensions (Matryoshka truncation from
              3072-dim). Python handles blood data; TypeScript handles
              user-entered entities.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid columns={{ initial: "1", sm: "2", lg: "3" }} gap="4">
          {embeddingFormats.map((ef, i) => (
            <ScrollReveal key={ef.entity} delay={i * 50}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
                style={{ height: "100%" }}
              >
                <Flex align="center" justify="between">
                  <Flex align="center" gap="3">
                    <div
                      className="deep-dive-icon"
                      style={{ background: ef.bg, color: ef.color }}
                    >
                      <ef.icon size={18} />
                    </div>
                    <Text size="3" weight="bold">
                      {ef.entity}
                    </Text>
                  </Flex>
                  <span className="arch-tag" style={{ fontSize: "10px" }}>
                    {ef.runtime}
                  </span>
                </Flex>

                <pre className="pg-code-block" style={{ maxWidth: "100%", fontSize: "0.72rem", lineHeight: 1.5 }}>
                  <code>{ef.template.replace(/\\n/g, "\n")}</code>
                </pre>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>
      </Box>

      {/* ── Synthesis Prompt Rules ── */}
      <Box
        id="synthesis-rules"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--blue-9)",
                fontSize: "11px",
              }}
            >
              Synthesize Node
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Synthesis Prompt Rules
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              The SYNTHESIS_SYSTEM prompt enforces 7 clinical rules at
              generation time. Temperature is set to 0.1 for clinical
              consistency. Chat history is limited to 6 items (3 turns).
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="3" style={{ maxWidth: 800, margin: "0 auto" }}>
          {synthesisRules.map((sr, i) => (
            <ScrollReveal key={sr.num} delay={i * 50}>
              <Flex
                align="start"
                gap="3"
                p="3"
                className="deep-dive-card"
              >
                <div className="synthesis-rule-num" style={{ color: sr.color, borderColor: sr.color }}>
                  {sr.num}
                </div>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text size="2" weight="bold">
                    {sr.rule}
                  </Text>
                  <Text
                    size="2"
                    color="gray"
                    style={{ lineHeight: 1.55 }}
                  >
                    {sr.detail}
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={400}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">temperature = 0.1</span>
            <span className="arch-tag">chat_history[-6:]</span>
            <span className="arch-tag">context joined by ---</span>
            <span className="arch-tag">12 citation authors</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Dual-Runtime Bridge ── */}
      <Box
        id="runtime-bridge"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--cyan-9)",
                fontSize: "11px",
              }}
            >
              System Architecture
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Dual-Runtime Bridge
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 580, lineHeight: 1.65 }}
            >
              TypeScript (Next.js) handles entity CRUD and UI. Python
              (FastAPI on :8001) handles PDF ingestion, LangGraph pipeline,
              and vector search. They communicate via internal API with a
              shared x-api-key header.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="3" style={{ maxWidth: 860, margin: "0 auto" }}>
          {bridgeEndpoints.map((ep, i) => (
            <ScrollReveal key={ep.path} delay={i * 50}>
              <Flex
                className="deep-dive-card"
                gap="4"
                p="4"
                align="start"
                direction={{ initial: "column", sm: "row" }}
              >
                <Flex align="center" gap="2" style={{ flexShrink: 0, minWidth: 180 }}>
                  <span
                    className="bridge-method"
                    style={{
                      background: ep.method === "DELETE"
                        ? "var(--crimson-a3)"
                        : "var(--green-a3)",
                      color: ep.method === "DELETE"
                        ? "var(--crimson-11)"
                        : "var(--green-11)",
                    }}
                  >
                    {ep.method}
                  </span>
                  <Text
                    size="2"
                    weight="bold"
                    style={{
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                      color: ep.color,
                      fontSize: "13px",
                    }}
                  >
                    {ep.path}
                  </Text>
                </Flex>

                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  <Text size="2" color="gray" style={{ lineHeight: 1.55 }}>
                    {ep.description}
                  </Text>
                  <Flex gap="4" wrap="wrap">
                    <Flex gap="1" align="baseline">
                      <Text size="1" weight="bold" style={{ fontSize: "10px", color: "var(--gray-8)" }}>
                        IN
                      </Text>
                      <Text
                        size="1"
                        style={{
                          fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                          fontSize: "11px",
                          color: "var(--gray-10)",
                        }}
                      >
                        {ep.input}
                      </Text>
                    </Flex>
                    <Flex gap="1" align="baseline">
                      <Text size="1" weight="bold" style={{ fontSize: "10px", color: "var(--gray-8)" }}>
                        OUT
                      </Text>
                      <Text
                        size="1"
                        style={{
                          fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                          fontSize: "11px",
                          color: "var(--gray-10)",
                        }}
                      >
                        {ep.output}
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={350}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">FastAPI :8001</span>
            <span className="arch-tag">x-api-key header</span>
            <span className="arch-tag">Python: blood data</span>
            <span className="arch-tag">TypeScript: entity CRUD</span>
            <span className="arch-tag">Shared 1024-dim vectors</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Context Assembly Pipeline ── */}
      <Box
        id="context-assembly"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--green-9)",
                fontSize: "11px",
              }}
            >
              Retrieve → Synthesize
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Context Assembly Pipeline
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              How retrieved chunks become a synthesis prompt. 5 steps from
              raw search results to a temperature-0.1 LLM call with
              citation extraction.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="4" style={{ maxWidth: 800, margin: "0 auto" }}>
          {contextSteps.map((cs, i) => (
            <ScrollReveal key={cs.step} delay={i * 60}>
              <Flex
                className="deep-dive-card"
                gap="3"
                p="4"
                align="start"
              >
                <div className="synthesis-rule-num" style={{ color: cs.color, borderColor: cs.color }}>
                  {cs.step}
                </div>
                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  <Text size="3" weight="bold">
                    {cs.title}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                    {cs.description}
                  </Text>
                  {cs.code && (
                    <pre className="pg-code-block" style={{ maxWidth: "100%", fontSize: "0.72rem" }}>
                      <code>{cs.code}</code>
                    </pre>
                  )}
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>
      </Box>

      {/* ── Evaluation Framework ── */}
      <Box
        id="evaluation"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--pink-9)",
                fontSize: "11px",
              }}
            >
              Quality Assurance
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Evaluation Framework
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              15+ eval scripts across DeepEval and RAGAS.
              5 RAG-triad metrics at 0.7 threshold, 8 multi-turn
              conversational scenarios, and a DeepSeek judge for
              automated grading.
            </Text>
          </Flex>
        </ScrollReveal>

        {/* RAG Triad Metrics */}
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="4">
            <Heading size="4" style={{ letterSpacing: "-0.01em" }}>
              RAG Triad Metrics
            </Heading>
            <Text size="1" color="gray">
              Every metric must pass at ≥ 70% across all test cases
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", sm: "2", md: "5" }}
          gap="3"
          mb="7"
          style={{ maxWidth: 960, margin: "0 auto" }}
        >
          {evalMetrics.map((m, i) => (
            <ScrollReveal key={m.name} delay={i * 50}>
              <Flex
                direction="column"
                align="center"
                gap="2"
                p="4"
                className="deep-dive-card"
                style={{ textAlign: "center" }}
              >
                <div
                  className="deep-dive-icon"
                  style={{
                    background: `color-mix(in srgb, ${m.color} 18%, transparent)`,
                    color: m.color,
                  }}
                >
                  <m.icon size={18} />
                </div>
                <Text size="2" weight="bold" style={{ fontSize: "13px" }}>
                  {m.name}
                </Text>
                <Text size="1" color="gray" style={{ lineHeight: 1.45, fontSize: "11px" }}>
                  {m.description}
                </Text>
                <span className="threshold-pill threshold-optimal">
                  ≥ {m.threshold}
                </span>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        {/* Conversational Scenarios */}
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="4" mt="6">
            <Heading size="4" style={{ letterSpacing: "-0.01em" }}>
              Multi-Turn Conversational Scenarios
            </Heading>
            <Text size="1" color="gray">
              8 scenarios testing cross-turn consistency, safety persistence, and domain transitions
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", sm: "2", md: "4" }}
          gap="3"
          style={{ maxWidth: 960, margin: "0 auto" }}
        >
          {evalScenarios.map((s, i) => (
            <ScrollReveal key={s.name} delay={i * 40}>
              <Flex
                direction="column"
                gap="2"
                p="3"
                className="deep-dive-card"
              >
                <Text
                  size="2"
                  weight="bold"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "12px",
                  }}
                >
                  {s.name}
                </Text>
                <Text size="1" color="gray" style={{ lineHeight: 1.45, fontSize: "11px" }}>
                  {s.description}
                </Text>
                <span className="arch-tag" style={{ alignSelf: "flex-start", fontSize: "10px" }}>
                  {s.turns} turns
                </span>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <ScrollReveal delay={380}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">DeepEval</span>
            <span className="arch-tag">RAGAS</span>
            <span className="arch-tag">DeepSeek judge</span>
            <span className="arch-tag">pytest</span>
            <span className="arch-tag">safety ≥ 80%</span>
            <span className="arch-tag">15+ eval scripts</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Schema Topology ── */}
      <Box
        id="schema-topology"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--green-9)",
                fontSize: "11px",
              }}
            >
              Drizzle ORM
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Schema Topology
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              28 PostgreSQL tables across 5 categories. Every user-owned
              entity cascades on deletion. Embedding tables cascade on
              their source entity — no orphaned vectors, no cleanup jobs.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex direction="column" gap="4" style={{ maxWidth: 860, margin: "0 auto" }}>
          {schemaCategories.map((cat, i) => (
            <ScrollReveal key={cat.category} delay={i * 60}>
              <Flex
                direction="column"
                gap="3"
                p="4"
                className="deep-dive-card"
              >
                <Flex align="center" justify="between">
                  <Flex align="center" gap="3">
                    <div
                      className="deep-dive-icon"
                      style={{
                        background: `color-mix(in srgb, ${cat.color} 18%, transparent)`,
                        color: cat.color,
                      }}
                    >
                      <Table2 size={18} />
                    </div>
                    <div>
                      <Text size="3" weight="bold">
                        {cat.category}
                      </Text>
                      <Text
                        size="1"
                        style={{ color: cat.color, fontSize: "11px", fontWeight: 600 }}
                      >
                        {cat.count} tables
                      </Text>
                    </div>
                  </Flex>
                </Flex>

                <Flex gap="2" wrap="wrap">
                  {cat.tables.map((t) => (
                    <span key={t} className="arch-tag" style={{ fontSize: "11px" }}>
                      {t}
                    </span>
                  ))}
                </Flex>

                <Text
                  size="2"
                  style={{
                    color: "var(--gray-10)",
                    lineHeight: 1.55,
                    paddingLeft: "1rem",
                    borderLeft: `2px solid ${cat.color}`,
                  }}
                >
                  {cat.detail}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={350}>
          <pre className="pg-code-block" style={{ maxWidth: 860, margin: "2rem auto 0" }}>
            <code>{`// Custom Drizzle vector type → pgvector(1024)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType()  { return "vector(1024)"; },
  toDriver(v) { return \`[\${v.join(",")}]\`; },
  fromDriver(v) {
    return v.slice(1, -1).split(",").map(Number);
  },
});`}</code>
          </pre>
        </ScrollReveal>
      </Box>

      {/* ── Triage Prompt ── */}
      <Box
        id="triage-prompt"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ background: "var(--gray-a2)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--indigo-9)",
                fontSize: "11px",
              }}
            >
              Triage Node Internals
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Triage Prompt &amp; Intent Parsing
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              The TRIAGE_SYSTEM prompt classifies every query into one of 8
              intents. JSON output is parsed with markdown-aware cleanup
              and a graceful fallback chain.
            </Text>
          </Flex>
        </ScrollReveal>

        <ScrollReveal>
          <pre className="pg-code-block" style={{ maxWidth: 800, margin: "0 auto 2rem" }}>
            <code>{`// TRIAGE_SYSTEM prompt (verbatim)
"You are a clinical query classifier for a blood marker
intelligence system.

Classify the user's query into exactly ONE intent:
- markers:        Blood marker values, levels, ranges, flags
- trajectory:     Trends over time, velocity, improving/deteriorating
- conditions:     Health conditions, diseases (NOT to diagnose)
- medications:    Drugs, dosages, drug-biomarker interactions
- symptoms:       Symptoms and their relation to markers
- appointments:   Scheduling, upcoming visits, providers
- general_health: Broad questions spanning multiple categories
- safety_refusal: Diagnosis/prescription requests, out-of-scope

Also extract entity names (marker, condition, medication names).

Respond ONLY with JSON:
{\\"intent\\": \\"...\\", \\"confidence\\": 0.0-1.0, \\"entities\\": [\\"...\\"]}"
`}</code>
          </pre>
        </ScrollReveal>

        <Flex direction="column" gap="3" style={{ maxWidth: 800, margin: "0 auto" }}>
          {triageSteps.map((ts, i) => (
            <ScrollReveal key={ts.step} delay={i * 50}>
              <Flex
                className="deep-dive-card"
                gap="3"
                p="3"
                align="start"
              >
                <div className="synthesis-rule-num" style={{ color: ts.color, borderColor: ts.color }}>
                  {ts.step}
                </div>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text size="2" weight="bold">
                    {ts.title}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: 1.55 }}>
                    {ts.description}
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>
      </Box>

      {/* ── LLM Resilience ── */}
      <Box
        id="llm-resilience"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--amber-9)",
                fontSize: "11px",
              }}
            >
              Production Hardening
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              LLM Resilience &amp; Configuration
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              The llm_backend module wraps an OpenAI-compatible endpoint
              with exponential backoff, singleton httpx clients, and
              separate sync/async/streaming code paths.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "2", sm: "3", md: "6" }}
          gap="3"
          style={{ maxWidth: 960, margin: "0 auto" }}
          mb="5"
        >
          {resilienceConfig.map((rc, i) => (
            <ScrollReveal key={rc.label} delay={i * 40}>
              <Flex
                direction="column"
                align="center"
                gap="2"
                p="3"
                className="deep-dive-card"
                style={{ textAlign: "center" }}
              >
                <div
                  className="deep-dive-icon"
                  style={{
                    background: `color-mix(in srgb, ${rc.color} 18%, transparent)`,
                    color: rc.color,
                    width: 32,
                    height: 32,
                  }}
                >
                  <rc.icon size={16} />
                </div>
                <Text
                  size="2"
                  weight="bold"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "14px",
                    color: rc.color,
                  }}
                >
                  {rc.value}
                </Text>
                <Text size="1" weight="bold" style={{ fontSize: "11px" }}>
                  {rc.label}
                </Text>
                <Text size="1" color="gray" style={{ fontSize: "10px", lineHeight: 1.4 }}>
                  {rc.detail}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <ScrollReveal delay={280}>
          <pre className="pg-code-block" style={{ maxWidth: 800, margin: "0 auto" }}>
            <code>{`# llm_backend.py — retry loop (simplified)
for attempt in range(MAX_RETRIES + 1):
    try:
        resp = client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        break
    except HTTPStatusError as exc:
        if exc.response.status_code in {429, 502, 503, 504}:
            time.sleep(2 ** (attempt + 1))  # 2s → 4s → 8s
            continue
        raise`}</code>
          </pre>
        </ScrollReveal>

        <ScrollReveal delay={320}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">OpenAI /v1/chat/completions</span>
            <span className="arch-tag">httpx singleton</span>
            <span className="arch-tag">sync + async + stream</span>
            <span className="arch-tag">SSE [DONE] protocol</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Auth & Session Guard ── */}
      <Box
        id="auth-session"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--green-9)",
                fontSize: "11px",
              }}
            >
              Security Layer
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Authentication &amp; Session Guard
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Better Auth manages OAuth providers and sessions in PostgreSQL.
              Every server action passes through withAuth() — a 4-line guard
              that validates the session token and returns the userId or
              redirects to login.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", md: "2" }}
          gap="4"
          style={{ maxWidth: 860, margin: "0 auto" }}
          mb="5"
        >
          {authLayers.map((al, i) => (
            <ScrollReveal key={al.layer} delay={i * 60}>
              <Flex
                gap="3"
                p="4"
                className="deep-dive-card"
                align="start"
              >
                <div
                  className="deep-dive-icon"
                  style={{
                    background: `color-mix(in srgb, ${al.color} 18%, transparent)`,
                    color: al.color,
                  }}
                >
                  <al.icon size={18} />
                </div>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text size="2" weight="bold">
                    {al.layer}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: 1.55 }}>
                    {al.detail}
                  </Text>
                  <Text
                    size="1"
                    style={{
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                      fontSize: "11px",
                      color: al.color,
                      opacity: 0.8,
                    }}
                  >
                    {al.tables}
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <ScrollReveal delay={280}>
          <pre className="pg-code-block" style={{ maxWidth: 600, margin: "0 auto" }}>
            <code>{`// lib/auth-helpers.ts — server action guard
export const withAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/auth/login");
  return { userId: session.user.id, user: session.user };
};`}</code>
          </pre>
        </ScrollReveal>

        <ScrollReveal delay={320}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">Better Auth</span>
            <span className="arch-tag">4 auth tables</span>
            <span className="arch-tag">IP + UserAgent tracking</span>
            <span className="arch-tag">CASCADE on user delete</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Health-State Trajectory ── */}
      <Box
        id="trajectory-pipeline"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--violet-9)",
                fontSize: "11px",
              }}
            >
              Longitudinal Analysis
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Health-State Trajectory Pipeline
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Each blood test becomes a 1024-dim health state. Cosine
              similarity measures stability between states, velocity
              tracks rate-of-change per day, and Qwen classifies the
              overall direction as improving, stable, or deteriorating.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex
          direction="column"
          gap="3"
          style={{ maxWidth: 720, margin: "0 auto" }}
          mb="5"
        >
          {trajectoryPipeline.map((tp, i) => (
            <ScrollReveal key={tp.step} delay={i * 50}>
              <Flex
                gap="3"
                p="4"
                className="deep-dive-card"
                align="start"
              >
                <div className="synthesis-rule-num" style={{ color: tp.color, borderColor: tp.color }}>
                  {tp.step}
                </div>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text size="2" weight="bold">
                    {tp.title}
                  </Text>
                  <Text size="2" color="gray" style={{ lineHeight: 1.55 }}>
                    {tp.description}
                  </Text>
                  <Text
                    size="1"
                    style={{
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                      fontSize: "11px",
                      color: tp.color,
                      opacity: 0.85,
                      marginTop: 2,
                    }}
                  >
                    {tp.code}
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={300}>
          <Flex gap="3" wrap="wrap" justify="center">
            <span className="arch-tag">Lacher et al. NHANES method</span>
            <span className="arch-tag">CTE + pgvector &lt;=&gt;</span>
            <span className="arch-tag">7 derived metrics</span>
            <span className="arch-tag">Qwen qwen-plus</span>
            <span className="arch-tag">temperature 0.3</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Marker Alias Resolution ── */}
      <Box
        id="marker-aliases"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--orange-9)",
                fontSize: "11px",
              }}
            >
              Name Normalization
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Marker Alias Resolution
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Labs use different names for the same biomarker. The alias
              map normalizes 41 variant names across 11 base markers so
              derived ratios (TG/HDL, NLR, De Ritis, TyG) always resolve
              regardless of which lab produced the PDF.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", sm: "2", md: "3" }}
          gap="3"
          style={{ maxWidth: 860, margin: "0 auto" }}
          mb="5"
        >
          {markerAliases.map((ma, i) => (
            <ScrollReveal key={ma.base} delay={i * 40}>
              <Flex
                direction="column"
                gap="2"
                p="3"
                className="deep-dive-card"
              >
                <Text
                  size="2"
                  weight="bold"
                  style={{ color: ma.color }}
                >
                  {ma.base}
                </Text>
                <Flex gap="2" wrap="wrap">
                  {ma.aliases.map((alias) => (
                    <Text
                      key={alias}
                      size="1"
                      style={{
                        fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: `color-mix(in srgb, ${ma.color} 12%, transparent)`,
                        color: ma.color,
                      }}
                    >
                      {alias}
                    </Text>
                  ))}
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <ScrollReveal delay={280}>
          <pre className="pg-code-block" style={{ maxWidth: 640, margin: "0 auto" }}>
            <code>{`// lib/embeddings.ts — TyG Index computation
const trig = resolve("triglycerides");
const gluc = resolve("glucose");
const gti =
  trig != null && gluc != null && trig > 0 && gluc > 0
    ? Math.log(trig * gluc * 0.5) / Math.LN10
    : null;
// resolve() walks MARKER_ALIAS_MAP until it finds a match
// "hdl-c" → "hdl cholesterol" → "hdl" — first hit wins`}</code>
          </pre>
        </ScrollReveal>

        <ScrollReveal delay={320}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">11 base markers</span>
            <span className="arch-tag">41 aliases</span>
            <span className="arch-tag">case-insensitive</span>
            <span className="arch-tag">EU comma decimals</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Cognitive Protocol Tracking ── */}
      <Box
        id="cognitive-protocols"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--indigo-9)",
                fontSize: "11px",
              }}
            >
              Brain Health
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Cognitive Protocol Tracking
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              Health protocols track supplements with dosage, frequency,
              and mechanism of action across 7 cognitive target areas.
              Baselines and check-ins create a time series of 5 cognitive
              dimensions scored 0–10 with delta computation.
            </Text>
          </Flex>
        </ScrollReveal>

        <Text
          size="1"
          weight="bold"
          align="center"
          mb="3"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "10px",
            color: "var(--gray-9)",
            display: "block",
          }}
        >
          7 Target Areas
        </Text>

        <Grid
          columns={{ initial: "2", sm: "3", md: "4" }}
          gap="3"
          style={{ maxWidth: 860, margin: "0 auto" }}
          mb="6"
        >
          {cognitiveTargetAreas.map((ct, i) => (
            <ScrollReveal key={ct.area} delay={i * 40}>
              <Flex
                direction="column"
                align="center"
                gap="2"
                p="3"
                className="deep-dive-card"
                style={{ textAlign: "center" }}
              >
                <div
                  className="deep-dive-icon"
                  style={{
                    background: `color-mix(in srgb, ${ct.color} 18%, transparent)`,
                    color: ct.color,
                  }}
                >
                  <ct.icon size={18} />
                </div>
                <Text
                  size="1"
                  weight="bold"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "11px",
                    color: ct.color,
                  }}
                >
                  {ct.area}
                </Text>
                <Text size="1" color="gray" style={{ fontSize: "10px", lineHeight: 1.4 }}>
                  {ct.description}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <Text
          size="1"
          weight="bold"
          align="center"
          mb="3"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "10px",
            color: "var(--gray-9)",
            display: "block",
          }}
        >
          5 Score Dimensions (0–10 Scale)
        </Text>

        <Flex
          gap="3"
          wrap="wrap"
          justify="center"
          style={{ maxWidth: 700, margin: "0 auto" }}
          mb="5"
        >
          {cognitiveScoreDimensions.map((cd, i) => (
            <ScrollReveal key={cd.dimension} delay={i * 50 + 200}>
              <Flex
                direction="column"
                align="center"
                gap="1"
                p="3"
                className="deep-dive-card"
                style={{ textAlign: "center", minWidth: 120 }}
              >
                <Text size="2" weight="bold">
                  {cd.label}
                </Text>
                <Text size="1" color="gray" style={{ fontSize: "10px" }}>
                  {cd.description}
                </Text>
                <Text
                  size="1"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "10px",
                    opacity: 0.6,
                  }}
                >
                  {cd.dimension}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={350}>
          <Flex gap="3" wrap="wrap" justify="center">
            <span className="arch-tag">6 schema tables</span>
            <span className="arch-tag">JSONB target_areas</span>
            <span className="arch-tag">unique baseline per protocol</span>
            <span className="arch-tag">check-in time series</span>
            <span className="arch-tag">30-day rolling avg</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Entity Relationship Graph ── */}
      <Box
        id="entity-graph"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--cyan-9)",
                fontSize: "11px",
              }}
            >
              Data Architecture
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Entity Relationship Graph
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              22 PostgreSQL tables connected by foreign keys with carefully
              chosen delete strategies: CASCADE for owned data, SET NULL
              for optional references, UNIQUE constraints for 1:1
              embedding pairs, and composite primary keys for M:N junctions.
            </Text>
          </Flex>
        </ScrollReveal>

        <Flex
          direction="column"
          gap="2"
          style={{ maxWidth: 760, margin: "0 auto" }}
          mb="5"
        >
          {entityRelationships.map((er, i) => (
            <ScrollReveal key={`${er.from}-${er.to}`} delay={i * 35}>
              <Flex
                gap="3"
                p="3"
                className="deep-dive-card"
                align="center"
              >
                <Text
                  size="1"
                  weight="bold"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "12px",
                    minWidth: 190,
                    color: er.color,
                  }}
                >
                  {er.from} → {er.to}
                </Text>
                <Text
                  size="1"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${er.color} 12%, transparent)`,
                    color: er.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {er.type}
                </Text>
                <Text size="1" color="gray" style={{ flex: 1, fontSize: "11px" }}>
                  {er.cascade}
                </Text>
              </Flex>
            </ScrollReveal>
          ))}
        </Flex>

        <ScrollReveal delay={400}>
          <Flex gap="3" wrap="wrap" justify="center">
            <span className="arch-tag">22 tables</span>
            <span className="arch-tag">8 embedding tables</span>
            <span className="arch-tag">vector(1024)</span>
            <span className="arch-tag">JSONB for metrics</span>
            <span className="arch-tag">M:N junction tables</span>
            <span className="arch-tag">Drizzle ORM</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Multi-Search Fan-Out ── */}
      <Box
        id="multi-search"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
        style={{ borderTop: "1px solid var(--gray-a3)" }}
      >
        <ScrollReveal>
          <Flex direction="column" align="center" gap="2" mb="7">
            <Text
              size="1"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--pink-9)",
                fontSize: "11px",
              }}
            >
              Retrieval Engine
            </Text>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Multi-Search Fan-Out
            </Heading>
            <Text
              size="2"
              color="gray"
              align="center"
              style={{ maxWidth: 560, lineHeight: 1.65 }}
            >
              A single embedding of the user query fans out to all 6
              entity tables in parallel. Markers use hybrid scoring
              (0.7 cosine + 0.3 FTS), all others use pure vector search
              with a 0.3 similarity threshold. Results are deduplicated
              and merged into a unified MultiSearchResult.
            </Text>
          </Flex>
        </ScrollReveal>

        <Grid
          columns={{ initial: "1", sm: "2", md: "3" }}
          gap="3"
          style={{ maxWidth: 860, margin: "0 auto" }}
          mb="5"
        >
          {multiSearchFanOut.map((ms, i) => (
            <ScrollReveal key={ms.table} delay={i * 50}>
              <Flex
                direction="column"
                gap="2"
                p="3"
                className="deep-dive-card"
              >
                <Text
                  size="1"
                  weight="bold"
                  style={{
                    fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    fontSize: "11px",
                    color: ms.color,
                  }}
                >
                  {ms.table}
                </Text>
                <Flex gap="2" align="center">
                  <Text
                    size="1"
                    style={{
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${ms.color} 14%, transparent)`,
                      color: ms.color,
                      fontSize: "10px",
                      fontFamily: "var(--font-mono, 'SF Mono', monospace)",
                    }}
                  >
                    {ms.scoring}
                  </Text>
                </Flex>
                <Flex gap="4">
                  <Text size="1" color="gray" style={{ fontSize: "10px" }}>
                    threshold: {ms.threshold}
                  </Text>
                  <Text size="1" color="gray" style={{ fontSize: "10px" }}>
                    limit: {ms.limit}
                  </Text>
                </Flex>
              </Flex>
            </ScrollReveal>
          ))}
        </Grid>

        <ScrollReveal delay={320}>
          <pre className="pg-code-block" style={{ maxWidth: 700, margin: "0 auto" }}>
            <code>{`# routes/search.py — hybrid scoring (markers only)
combined_score = (
  0.3 * ts_rank(to_tsvector('english', content),
                 plainto_tsquery('english', :query))
+ 0.7 * (1 - (embedding <=> :query_vec))
)
# All other tables: pure cosine similarity
# 1 - (embedding <=> :query_vec) >= 0.3 threshold`}</code>
          </pre>
        </ScrollReveal>

        <ScrollReveal delay={360}>
          <Flex gap="3" wrap="wrap" justify="center" mt="5">
            <span className="arch-tag">1 embedding → 6 parallel queries</span>
            <span className="arch-tag">hybrid for markers</span>
            <span className="arch-tag">vector for entities</span>
            <span className="arch-tag">MultiSearchResult</span>
            <span className="arch-tag">x-api-key auth</span>
          </Flex>
        </ScrollReveal>
      </Box>

      {/* ── Detailed Sections ── */}
      <HowItWorksClient />

      {/* ── CTA ── */}
      <Box
        className="cta-banner"
        py="9"
        px={{ initial: "4", md: "6", lg: "9" }}
      >
        <Flex direction="column" align="center" gap="5">
          <ScrollReveal>
            <Heading
              size="7"
              align="center"
              style={{ letterSpacing: "-0.03em" }}
            >
              Ready to upload your first panel?
            </Heading>
          </ScrollReveal>
          <Text size="3" color="gray" align="center">
            Free to use. No credit card required.
          </Text>
          <Flex gap="3" wrap="wrap" justify="center">
            <Button size="3" asChild className="cta-button">
              <Link href="/auth/sign-up">Start Tracking — Free</Link>
            </Button>
            <Button
              size="3"
              variant="outline"
              asChild
              className="cta-button"
            >
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* ── Footer ── */}
      <Box asChild style={{ borderTop: "1px solid var(--gray-a3)" }}>
        <footer>
          <Grid
            columns={{ initial: "1", sm: "3" }}
            gap="6"
            py="8"
            px={{ initial: "4", md: "6", lg: "9" }}
          >
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Logo size={16} />
                <Text size="3" weight="bold">
                  Agentic Healthcare
                </Text>
              </Flex>
              <Text size="2" color="gray">
                Longitudinal blood test intelligence. Turn snapshots into
                trajectories.
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Product
              </Text>
              <Text asChild size="2" color="gray">
                <Link
                  href="/how-it-works"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  How It Works
                </Link>
              </Text>
              <Text asChild size="2" color="gray">
                <Link
                  href="/#features"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Features
                </Link>
              </Text>
              <Text asChild size="2" color="gray">
                <Link
                  href="/auth/sign-up"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Get Started
                </Link>
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Clinical
              </Text>
              <Text size="2" color="gray">
                7 ratios · 8 peer-reviewed papers
              </Text>
              <Text
                size="1"
                color="gray"
                style={{ opacity: 0.6 }}
              >
                Not medical advice. Consult your physician for clinical
                decisions.
              </Text>
            </Flex>
          </Grid>

          <Flex
            justify="between"
            align="center"
            py="4"
            px={{ initial: "4", md: "6", lg: "9" }}
            style={{ borderTop: "1px solid var(--gray-a3)" }}
          >
            <Text size="1" color="gray">
              © 2026 Agentic Healthcare
            </Text>
            <Text size="1" color="gray">
              Powered by AI
            </Text>
          </Flex>
        </footer>
      </Box>
    </Box>
  );
}
