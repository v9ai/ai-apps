"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import Link from "next/link";

const WORKERS = [
  { name: "lead-gen-janitor", config: "wrangler.toml", runtime: "TypeScript", notes: "Daily midnight UTC, triggers ATS ingestion" },
  { name: "lead-gen-insert-jobs", config: "wrangler.insert-jobs.toml", runtime: "TypeScript", notes: "Queue-based job ingestion" },
  { name: "lead-gen-process-companies-cron", config: "wrangler.process-companies-cron.toml", runtime: "TypeScript", notes: "Company processing cron" },
  { name: "dlq-consumer", config: "wrangler.dlq-consumer.toml", runtime: "TypeScript", notes: "Dead-letter queue consumer" },
  { name: "observability-tail", config: "wrangler.observability-tail.toml", runtime: "TypeScript", notes: "Observability logging tail" },
  { name: "ats-crawler", config: "workers/ashby-crawler/wrangler.toml", runtime: "Rust/WASM", notes: "Common Crawl → Ashby boards, cron 02:00 UTC" },
  { name: "lead-gen-process-jobs", config: "workers/process-jobs/wrangler.jsonc", runtime: "Python/LangGraph", notes: "Every 6h + queue, DeepSeek classification" },
  { name: "lead-gen-eu-classifier", config: "workers/eu-classifier/wrangler.jsonc", runtime: "Python", notes: "EU job classification" },
  { name: "lead-gen-resume-rag", config: "workers/resume-rag/wrangler.jsonc", runtime: "Python", notes: "Vectorize + Workers AI" },
  { name: "lead-gen-job-matcher", config: "workers/job-matcher/wrangler.jsonc", runtime: "Python", notes: "Resume-to-job matching" },
  { name: "job-reporter-llm", config: "workers/job-reporter-llm/wrangler.toml", runtime: "TypeScript", notes: "LLM-based job report analysis" },
  { name: "lead-gen-cleanup-jobs", config: "workers/cleanup-jobs/wrangler.jsonc", runtime: "Python", notes: "Job cleanup" },
] as const;

export default function WorkersPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [resumeCount, setResumeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/resume-count")
      .then((r) => r.json())
      .then((d) => setResumeCount((d as { count?: number }).count ?? 0))
      .catch(() => setResumeCount(null));
  }, [isAdmin]);

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="4">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">This page is restricted to administrators.</Text>
            <Button asChild variant="soft">
              <Link href="/">← Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="4">
        <Box>
          <Heading size="7">Worker Status</Heading>
          <Text color="gray" size="2">
            Cloudflare Workers overview
          </Text>
        </Box>
        <Button asChild variant="soft">
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ReloadIcon /> Cloudflare Dashboard
          </a>
        </Button>
      </Flex>

      <Text size="2" color="gray" mb="6" as="p">
        The pipeline runs across three runtimes:{" "}
        <Text weight="medium" color="gray">TypeScript</Text> workers handle ATS ingestion, queues, and cron scheduling;{" "}
        <Text weight="medium" color="gray">Python/LangGraph</Text> workers run DeepSeek-powered job classification, EU filtering, resume RAG (Vectorize + Workers AI), and job-to-resume matching;{" "}
        <Text weight="medium" color="gray">Rust/WASM</Text> powers the Ashby board crawler via Common Crawl.
        The Next.js app layer reads from <Text weight="medium" color="gray">Neon PostgreSQL</Text>; CF Workers (janitor, insert-jobs) are pending migration to Neon.
      </Text>

      {/* Feature Adoption */}
      <Heading size="4" mb="3">Feature Adoption</Heading>
      <Flex gap="3" mb="6">
        <Card style={{ minWidth: 160 }}>
          <Flex direction="column" gap="1" p="2">
            <Text size="1" color="gray">Resumes uploaded</Text>
            <Text size="5" weight="bold">
              {resumeCount === null ? "…" : resumeCount}
            </Text>
          </Flex>
        </Card>
      </Flex>

      {/* Cloudflare Workers */}
      <Heading size="4" mb="3">
        Cloudflare Workers
      </Heading>
      <Flex direction="column" gap="3" mb="6">
        {WORKERS.map((w) => (
          <Card key={w.name}>
            <Flex justify="between" align="center" gap="4">
              <Box>
                <Flex gap="2" align="center" mb="1">
                  <Text size="3" weight="bold">
                    {w.name}
                  </Text>
                  <Badge color="gray" size="1" variant="soft">
                    {w.runtime}
                  </Badge>
                </Flex>
                <Text size="1" color="gray">
                  {w.config} · {w.notes}
                </Text>
              </Box>
              <Button asChild size="1" variant="ghost">
                <a
                  href={`https://dash.cloudflare.com/?to=/:account/workers/services/view/${w.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View logs →
                </a>
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Known issues */}
      <Heading size="4" mb="3">
        Known Issues
      </Heading>
      <Flex direction="column" gap="2">
        {[
          {
            text: "janitor and insert-jobs workers still use D1 binding — pending migration to Neon",
            severity: "orange" as const,
          },
          {
            text: "enhanceJobFromATS mutation has no auth check",
            severity: "red" as const,
          },
        ].map(({ text, severity }) => (
          <Card key={text}>
            <Flex gap="3" align="center">
              <ExclamationTriangleIcon color={severity === "red" ? "red" : "orange"} />
              <Text size="2">{text}</Text>
              <Badge color={severity} size="1" variant="soft" style={{ marginLeft: "auto", flexShrink: 0 }}>
                {severity === "red" ? "high" : "medium"}
              </Badge>
            </Flex>
          </Card>
        ))}
      </Flex>
    </Container>
  );
}
