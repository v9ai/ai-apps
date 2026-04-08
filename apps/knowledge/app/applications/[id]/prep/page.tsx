"use client";

import { Suspense, useState, useEffect } from "react";
import {
  Container,
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Skeleton,
  Badge,
} from "@radix-ui/themes";
import { ArrowLeftIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AppData } from "@/components/app-detail/types";

function PrepPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/applications/${params.id}`)
        .then((r) => {
          if (r.status === 401) {
            router.push("/login");
            return null;
          }
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then((data) => data && setApp(data))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
        <Skeleton height="600px" />
      </Container>
    );
  }

  if (error || !app) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">{error ? "Error" : "Not Found"}</Heading>
            <Text color="gray">{error ?? "This application doesn\u2019t exist or you don\u2019t have access."}</Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const content = app.aiInterviewQuestions;

  return (
    <Container size="3" p={{ initial: "4", md: "8" }}>
      {/* Navigation */}
      <Flex align="center" gap="3" mb="5">
        <Link
          href={`/applications/${app.slug}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gray-11)", textDecoration: "none" }}
        >
          <ArrowLeftIcon />
          <Text size="2">{app.company}</Text>
        </Link>
        <Text size="2" color="gray">/</Text>
        <Text size="2" weight="medium">{app.position}</Text>
      </Flex>

      {/* Page header */}
      <Flex justify="between" align="start" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="7" mb="2">Study Plan</Heading>
          <Flex align="center" gap="2">
            <Badge color="violet" variant="soft" size="2">Interview Prep</Badge>
            <Text size="2" color="gray">{app.company} &middot; {app.position}</Text>
          </Flex>
        </Box>
        <Flex gap="2">
          <Button size="2" variant="soft" color="gray" asChild>
            <Link href={`/applications/${app.slug}/notes`}>Notes</Link>
          </Button>
          {app.url && (
            <Button size="2" variant="soft" asChild>
              <a href={app.url} target="_blank" rel="noopener noreferrer">
                Job Posting <ExternalLinkIcon />
              </a>
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Content */}
      {content ? (
        <Box className="interview-prep-md" style={{ maxWidth: "100%" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <Heading size="6" mb="3" mt="6" style={{ color: "var(--violet-11)" }}>{children}</Heading>
              ),
              h2: ({ children }) => (
                <Box mt="6" mb="3" pt="5" style={{ borderTop: "2px solid var(--violet-4)" }}>
                  <Heading size="5" style={{ color: "var(--violet-11)" }}>{children}</Heading>
                </Box>
              ),
              h3: ({ children }) => (
                <Box mt="5" mb="2" p="3" style={{ backgroundColor: "var(--violet-2)", borderLeft: "3px solid var(--violet-8)", borderRadius: 0 }}>
                  <Heading size="4">{children}</Heading>
                </Box>
              ),
              h4: ({ children }) => (
                <Heading size="3" mt="4" mb="2">{children}</Heading>
              ),
              p: ({ children }) => (
                <Text as="p" size="2" mb="3" style={{ lineHeight: 1.8 }}>{children}</Text>
              ),
              strong: ({ children }) => (
                <strong style={{ fontWeight: 600 }}>{children}</strong>
              ),
              em: ({ children }) => <em>{children}</em>,
              ul: ({ children }) => (
                <ul style={{ paddingLeft: 20, lineHeight: 1.9, marginBottom: 16 }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: 20, lineHeight: 1.9, marginBottom: 16 }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ lineHeight: 1.8, marginBottom: 6, fontSize: "var(--font-size-2)" }}>{children}</li>
              ),
              blockquote: ({ children }) => (
                <Box mb="4" pl="4" py="2" style={{ borderLeft: "3px solid var(--violet-6)", backgroundColor: "var(--violet-2)", borderRadius: "0 var(--radius-2) var(--radius-2) 0" }}>
                  {children}
                </Box>
              ),
              table: ({ children }) => (
                <Box mb="4" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-2)" }}>
                    {children}
                  </table>
                </Box>
              ),
              thead: ({ children }) => (
                <thead style={{ backgroundColor: "var(--violet-2)" }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, borderBottom: "2px solid var(--violet-6)" }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--gray-4)" }}>{children}</td>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <Box mb="4" p="4" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", overflowX: "auto", border: "1px solid var(--gray-4)" }}>
                    <pre style={{ margin: 0, fontSize: "var(--font-size-1)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.7 }}>
                      <code>{children}</code>
                    </pre>
                  </Box>
                ) : (
                  <code style={{ backgroundColor: "var(--violet-3)", padding: "2px 6px", borderRadius: "var(--radius-1)", fontSize: "0.9em", fontFamily: "var(--font-mono, monospace)" }}>
                    {children}
                  </code>
                );
              },
              hr: () => (
                <Box my="6" style={{ borderTop: "2px solid var(--gray-4)" }} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </Box>
      ) : (
        <Card style={{ borderLeft: "3px solid var(--violet-6)", borderRadius: 0 }}>
          <Flex direction="column" align="center" justify="center" gap="3" py="8">
            <Text size="2" color="gray">No study plan generated yet.</Text>
            <Text size="1" color="gray">
              Add a job description first, then generate prep from the application detail page.
            </Text>
            <Button size="2" variant="soft" asChild>
              <Link href={`/applications/${app.slug}`}>Go to Application</Link>
            </Button>
          </Flex>
        </Card>
      )}
    </Container>
  );
}

export default function PrepPage() {
  return (
    <Suspense fallback={
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
        <Skeleton height="600px" />
      </Container>
    }>
      <PrepPageInner />
    </Suspense>
  );
}
