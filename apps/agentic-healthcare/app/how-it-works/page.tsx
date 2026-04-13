import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import {
  Box,
  Container,
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
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { HowItWorksClient } from "./how-it-works-client";
import { TocNav } from "./toc-nav";
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
    items: ["Vitest", "Promptfoo", "RAGAS"],
  },
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <Box style={{ minHeight: "100vh" }}>
      {/* Scroll progress bar */}
      <Box className="scroll-progress" />

      {/* Floating TOC */}
      <TocNav />

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
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
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
          </Container>
        </header>
      </Box>

      {/* ── Hero ── */}
      <Box className="hiw-hero" py="9">
        <div className="hiw-hero-orb" />
        <Container size="2" style={{ position: "relative", zIndex: 1 }}>
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
        </Container>
      </Box>

      {/* ── Architecture Diagrams ── */}
      <Box py="8">
        <Container size="3" px="4">
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
                      style={{ maxWidth: 640, lineHeight: 1.65 }}
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
        </Container>
      </Box>

      {/* ── Tech Stack at a Glance ── */}
      <Box
        id="tech-stack"
        py="8"
        style={{ background: "var(--gray-a2)" }}
      >
        <Container size="3" px="4">
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

          <Grid
            columns={{ initial: "2", sm: "3", md: "5" }}
            gap="4"
          >
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
        </Container>
      </Box>

      {/* ── Detailed Sections ── */}
      <HowItWorksClient />

      {/* ── CTA ── */}
      <Box className="cta-banner" py="9">
        <Container size="2">
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
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box asChild style={{ borderTop: "1px solid var(--gray-a3)" }}>
        <footer>
          <Container size="3">
            <Grid
              columns={{ initial: "1", sm: "3" }}
              gap="6"
              py="8"
              px="4"
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
              px="4"
              style={{ borderTop: "1px solid var(--gray-a3)" }}
            >
              <Text size="1" color="gray">
                © 2026 Agentic Healthcare
              </Text>
              <Text size="1" color="gray">
                Powered by AI
              </Text>
            </Flex>
          </Container>
        </footer>
      </Box>
    </Box>
  );
}
