import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { HeartPulse, Github } from "lucide-react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Agentic Healthcare",
  description: "A Next.js 15 platform that transforms blood test PDFs into AI-driven health insights using Neon pgvector, Qwen embeddings, and Drizzle ORM.",
};

export default function HowItWorksPage() {
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

      <HowItWorksClient />
    </Box>
  );
}
