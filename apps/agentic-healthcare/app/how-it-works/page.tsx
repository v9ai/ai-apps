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
