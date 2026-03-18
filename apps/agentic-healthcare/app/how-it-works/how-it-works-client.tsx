"use client";
import { Suspense } from "react";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { HeartPulse, Github } from "lucide-react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { papers, researchStats, pipelineAgents, story, extraSections } from "./data";

const prose: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "0 1rem 3rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

export function HowItWorksClient() {
  return (
    <Box style={{ minHeight: "100vh" }}>
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
                <HeartPulse size={20} style={{ color: "var(--indigo-9)" }} />
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

      <div style={prose}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "2rem 0 0" }}>How It Works</h2>
      <p style={{ color: "var(--gray-a8, rgba(0,0,0,0.5))", margin: "0.5rem 0 0" }}>
        A Next.js 15 platform that transforms blood test PDFs into AI-driven health insights using Neon pgvector, Qwen embeddings, and Drizzle ORM.
      </p>
      <p style={{ margin: "1.5rem 0 0" }}>{story}</p>

      {researchStats.length > 0 && (
        <p style={{ margin: "1.5rem 0 0" }}>
          <strong>Key findings: </strong>
          {researchStats.map((s) => `${s.number} ${s.label}${s.source ? ` (${s.source})` : ""}`).join("; ")}.
        </p>
      )}

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>Technical Foundations</h3>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {papers.map((paper) => (
          <li key={paper.slug} style={{ marginBottom: "1rem" }}>
            <em>{paper.title}</em>
            {paper.authors && <> — {paper.authors}</>}
            {paper.year && <> ({paper.year})</>}
            {paper.finding && <>. <strong>Finding:</strong> {paper.finding}</>}
            {paper.relevance && <> <strong>Relevance:</strong> {paper.relevance}</>}
            {paper.url && <> <a href={paper.url} target="_blank" rel="noopener noreferrer">[link]</a></>}
          </li>
        ))}
      </ol>

      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "2.5rem 0 0.75rem" }}>Pipeline</h3>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {pipelineAgents.map((agent) => (
          <li key={agent.name} style={{ marginBottom: "1.25rem" }}>
            <strong>{agent.name}</strong> — {agent.description}
            {agent.researchBasis && <> <em>Research basis: {agent.researchBasis}.</em></>}
          </li>
        ))}
      </ol>

      {extraSections.map((section, i) => (
        <div key={i}>
          <hr style={{ border: "none", borderTop: "1px solid var(--gray-a3, rgba(0,0,0,0.08))", margin: "2.5rem 0" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>{section.heading}</h3>
          <p>{section.content}</p>
        </div>
      ))}
    </div>
    </Box>
  );
}
