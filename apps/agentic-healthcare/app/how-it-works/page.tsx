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
    sub: "6 entity tables",
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
      "Blood test PDFs are uploaded to R2, converted to markdown by LlamaParse, parsed through a 3-tier cascade (HTML table, FormKeysValues, free-text), then embedded with BGE 1024-dim and stored in Neon PostgreSQL.",
    tags: ["Cloudflare R2", "LlamaParse", "3-tier cascade", "BGE 1024-dim"],
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
      "The triage intent fans out to different search strategies: marker queries use hybrid search (0.7 cosine + 0.3 FTS), trajectory adds trend data, general health fans out to all 6 entity tables, and safety refusals skip retrieval entirely.",
    tags: [
      "Hybrid search",
      "Cosine 0.7 + FTS 0.3",
      "6 entity tables",
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
    brief: "6 types \u2192 format \u2192 BGE \u2192 pgvector + HNSW",
    description:
      "Six entity types (tests, markers, health state, conditions, medications, symptoms) each have dedicated formatters. All are embedded with BGE-large-en-v1.5 at 1024 dimensions and stored in paired pgvector tables with HNSW indexes.",
    tags: ["6 entity types", "BGE-large 1024d", "pgvector", "HNSW index"],
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
    items: ["Neon PostgreSQL", "Drizzle ORM", "pgvector + HNSW"],
  },
  {
    category: "AI / ML",
    color: "var(--amber-9)",
    items: ["DeepSeek R1", "BGE-large 1024d", "LlamaParse"],
  },
  {
    category: "Infrastructure",
    color: "var(--cyan-9)",
    items: ["Vercel", "Cloudflare R2", "Turbopack"],
  },
  {
    category: "Evaluation",
    color: "var(--pink-9)",
    items: ["Promptfoo", "RAGAS"],
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
      "7 clinical ratios (TG/HDL, NLR, De Ritis, eGFR, etc.) are stored as structured JSONB in health_state_embeddings.derived_metrics. Queryable, indexable, and extensible without schema migrations.",
    detail:
      "Each blood test gets a health-state embedding with both a 1024-dim vector and a JSONB payload containing all computed ratios with risk classifications (optimal / borderline / elevated).",
  },
  {
    icon: Zap,
    color: "var(--indigo-9)",
    bg: "var(--indigo-a3)",
    title: "Trajectory via Cosine Distance",
    description:
      "Longitudinal health tracking uses a SQL CTE to compute cosine similarity between the latest health-state embedding and every prior test — inside the database, not in application code.",
    sql: `WITH latest AS (
  SELECT embedding
  FROM health_state_embeddings
  WHERE user_id = $1
  ORDER BY created_at DESC LIMIT 1
)
SELECT t.test_date, e.derived_metrics,
  1 - (e.embedding <=> (SELECT embedding FROM latest))
    AS similarity_to_latest
FROM health_state_embeddings e
JOIN blood_tests t ON t.id = e.test_id
WHERE e.user_id = $1
ORDER BY t.test_date ASC;`,
  },
  {
    icon: Lock,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    title: "Row-Level User Isolation",
    description:
      "Every table and every embedding table has a user_id column with B-tree indexes. Vector searches are always scoped to the authenticated user — the query planner prunes the search space before touching any vectors.",
    detail:
      "CASCADE DELETE on foreign keys means deleting a blood test automatically removes its marker embeddings and health-state embeddings. No orphaned vectors, no cleanup jobs.",
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
    description: "Blood marker values, levels, reference ranges, flags",
    strategy: "Hybrid search (0.7 cosine + 0.3 FTS) on markers → blood tests",
    k: "10 + 3",
    example: "What is my cholesterol level?",
  },
  {
    name: "trajectory",
    icon: TrendingUp,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    description: "Trends, changes over time, velocity, improving/deteriorating",
    strategy: "Hybrid markers → blood tests → trend search per entity",
    k: "10 + 3 + 20/entity",
    example: "Is my iron improving?",
  },
  {
    name: "conditions",
    icon: Heart,
    color: "var(--amber-9)",
    bg: "var(--amber-a3)",
    description: "Health conditions, diseases, chronic issues",
    strategy: "Condition embeddings → hybrid markers",
    k: "5 + 5",
    example: "Tell me about my thyroid condition",
  },
  {
    name: "medications",
    icon: Pill,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    description: "Drugs, dosages, drug-biomarker interactions",
    strategy: "Medication embeddings → hybrid markers",
    k: "5 + 5",
    example: "What medications interact with my markers?",
  },
  {
    name: "symptoms",
    icon: Activity,
    color: "var(--pink-9)",
    bg: "var(--pink-a3)",
    description: "Symptoms and their relation to lab markers",
    strategy: "Symptom embeddings → hybrid markers",
    k: "5 + 5",
    example: "Could my fatigue be related to my labs?",
  },
  {
    name: "appointments",
    icon: Calendar,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    description: "Scheduling, upcoming visits, providers",
    strategy: "Appointment embeddings only",
    k: "5",
    example: "When is my next blood draw?",
  },
  {
    name: "general_health",
    icon: Layers,
    color: "var(--indigo-9)",
    bg: "var(--indigo-a3)",
    description: "Broad health questions spanning multiple categories",
    strategy: "Fan-out: tests(3) + markers(5) + conditions(3) + meds(3) + symptoms(3)",
    k: "17 total",
    example: "Give me an overall health summary",
  },
  {
    name: "safety_refusal",
    icon: ShieldCheck,
    color: "var(--crimson-9)",
    bg: "var(--crimson-a3)",
    description: "Diagnosis requests, treatment prescriptions, out-of-scope",
    strategy: "No retrieval — returns safety disclaimer",
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
    description: "Fan-out across all 6 entity tables, returns combined results",
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
              A LangGraph StateGraph triages every query, retrieves from 6
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
              <span className="floating-badge">6 entity tables</span>
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
              Each entity type has a dedicated format function that builds the
              text string before BGE-large-en-v1.5 encodes it into 1024
              dimensions. Python handles blood data; TypeScript handles
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
            <span className="arch-tag">Shared BGE 1024-dim</span>
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
              15+ eval scripts across Promptfoo, DeepEval, and RAGAS.
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
            <span className="arch-tag">Promptfoo</span>
            <span className="arch-tag">DeepEval</span>
            <span className="arch-tag">RAGAS</span>
            <span className="arch-tag">DeepSeek judge</span>
            <span className="arch-tag">pytest</span>
            <span className="arch-tag">safety ≥ 80%</span>
            <span className="arch-tag">15+ eval scripts</span>
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
