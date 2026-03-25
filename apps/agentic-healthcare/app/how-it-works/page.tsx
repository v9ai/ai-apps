import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, Container, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { Github } from "lucide-react";
import { Logo } from "@/components/logo";
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
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
              <Flex align="center" gap="2">
                <Logo size={20} />
                <Heading size="4" asChild style={{ letterSpacing: "-0.02em" }}>
                  <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
                    Agentic Healthcare
                  </Link>
                </Heading>
              </Flex>
              <Flex align="center" gap="5">
                <Flex gap="5" display={{ initial: "none", sm: "flex" }}>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link href="/how-it-works" style={{ textDecoration: "none", color: "inherit" }}>
                      How It Works
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link href="/#features" style={{ textDecoration: "none", color: "inherit" }}>
                      Features
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link href="/#research" style={{ textDecoration: "none", color: "inherit" }}>
                      Research
                    </Link>
                  </Text>
                </Flex>
                <a
                  href="https://github.com/nicolad/ai-apps"
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
        <Container size="2" style={{ position: "relative", zIndex: 1 }}>
          <Flex direction="column" align="center" gap="5" py="7">
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
              <span className="gradient-text">guarded insight</span>
              {" "}in 4 nodes
            </Heading>
            <Text
              size="3"
              color="gray"
              align="center"
              style={{ maxWidth: 520, lineHeight: 1.65 }}
            >
              A LangGraph StateGraph triages every query, retrieves from 6 entity
              tables, synthesizes with clinical safety rules, and audits the
              response before it reaches you.
            </Text>

            {/* Node flow visualization */}
            <Flex
              className="hiw-node-flow"
              mt="4"
              gap="2"
              wrap="wrap"
              justify="center"
              align="center"
            >
              <div className="hiw-node">
                <div className="hiw-node-icon">1</div>
                <span className="hiw-node-label">Triage</span>
              </div>
              <span className="hiw-node-arrow">→</span>
              <div className="hiw-node">
                <div className="hiw-node-icon">2</div>
                <span className="hiw-node-label">Retrieve</span>
              </div>
              <span className="hiw-node-arrow">→</span>
              <div className="hiw-node">
                <div className="hiw-node-icon">3</div>
                <span className="hiw-node-label">Synthesize</span>
              </div>
              <span className="hiw-node-arrow">→</span>
              <div className="hiw-node">
                <div className="hiw-node-icon">4</div>
                <span className="hiw-node-label">Guard</span>
              </div>
            </Flex>

            <Box className="trajectory-line" mt="3" />

            <Flex className="floating-badges" mt="1">
              <span className="floating-badge">8 intent classes</span>
              <span className="floating-badge">6 entity tables</span>
              <span className="floating-badge">5 safety rules</span>
              <span className="floating-badge">1024-dim vectors</span>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* ── Interactive Architecture Diagrams ── */}
      <Box py="6">
        <Container size="3" px="4">
          <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
            Drag nodes to rearrange. Scroll to zoom.
          </Text>

          <Separator size="4" my="5" />

          {/* 1. Ingestion */}
          <Flex direction="column" gap="3" mb="6">
            <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
              PDF Ingestion Pipeline
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 640, lineHeight: 1.65 }}>
              Blood test PDFs are uploaded to R2, converted to markdown by LlamaParse,
              parsed through a 3-tier cascade (HTML table, FormKeysValues, free-text),
              then embedded with BGE 1024-dim and stored in Neon PostgreSQL.
            </Text>
            <IngestionFlow />
          </Flex>

          <Separator size="4" my="5" />

          {/* 2. LangGraph Pipeline */}
          <Flex direction="column" gap="3" mb="6">
            <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
              LangGraph StateGraph Pipeline
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 640, lineHeight: 1.65 }}>
              Every chat query flows through 4 typed nodes: triage classifies intent
              into 8 categories, retrieve routes to the right pgvector tables,
              synthesize generates a clinical answer, and guard audits for safety.
            </Text>
            <PipelineFlow />
          </Flex>

          <Separator size="4" my="5" />

          {/* 3. Retrieval Routing */}
          <Flex direction="column" gap="3" mb="6">
            <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
              Intent-Based Retrieval Routing
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 640, lineHeight: 1.65 }}>
              The triage intent fans out to different search strategies: marker queries
              use hybrid search (0.7 cosine + 0.3 FTS), trajectory adds trend data,
              general health fans out to all 6 entity tables, and safety refusals
              skip retrieval entirely.
            </Text>
            <RetrievalFlow />
          </Flex>

          <Separator size="4" my="5" />

          {/* 4. Safety Guard */}
          <Flex direction="column" gap="3" mb="6">
            <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
              Safety Guard Audit
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 640, lineHeight: 1.65 }}>
              Every synthesised response passes through a DeepSeek auditor checking
              5 rules: no diagnosis, no prescription, physician referral required,
              no PII leakage, no hallucination. Failed responses get disclaimers appended.
            </Text>
            <GuardFlow />
          </Flex>

          <Separator size="4" my="5" />

          {/* 5. Embedding Strategy */}
          <Flex direction="column" gap="3" mb="6">
            <Heading size="5" style={{ letterSpacing: "-0.02em" }}>
              Multi-Entity Embedding Strategy
            </Heading>
            <Text size="2" color="gray" style={{ maxWidth: 640, lineHeight: 1.65 }}>
              Six entity types (tests, markers, health state, conditions, medications,
              symptoms) each have dedicated formatters. All are embedded with BGE-large-en-v1.5
              at 1024 dimensions and stored in paired pgvector tables with HNSW indexes.
            </Text>
            <EmbeddingFlow />
          </Flex>

          <Separator size="4" my="5" />
        </Container>
      </Box>

      <HowItWorksClient />
    </Box>
  );
}
