"use client";

import { Heading, Flex, Text, Box, Card } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TabBaseProps } from "./types";

export function InterviewPrepTab({ app }: TabBaseProps) {
  if (!app.aiInterviewQuestions) {
    return (
      <Card style={{ borderLeft: "3px solid var(--violet-6)", borderRadius: 0 }}>
        <Flex direction="column" align="center" justify="center" gap="2" py="8" style={{ opacity: 0.7 }}>
          <InfoCircledIcon width={24} height={24} color="var(--gray-8)" />
          <Text size="2" color="gray">No interview prep generated yet.</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card style={{ borderLeft: "3px solid var(--violet-6)", borderRadius: 0 }}>
      <Heading size="4" mb="4">Interview Prep</Heading>
      <Box className="interview-prep-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <Heading size="5" mb="2" mt="4" style={{ color: "var(--violet-11)" }}>{children}</Heading>
            ),
            h2: ({ children }) => (
              <Box mt="5" mb="2" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                <Heading size="4" style={{ color: "var(--violet-11)" }}>{children}</Heading>
              </Box>
            ),
            h3: ({ children }) => (
              <Box mt="4" mb="2" p="3" style={{ backgroundColor: "var(--violet-2)", borderLeft: "3px solid var(--violet-8)", borderRadius: 0 }}>
                <Heading size="3">{children}</Heading>
              </Box>
            ),
            p: ({ children }) => (
              <Text as="p" size="2" mb="2" style={{ lineHeight: 1.7 }}>{children}</Text>
            ),
            strong: ({ children }) => (
              <strong style={{ fontWeight: 600 }}>{children}</strong>
            ),
            em: ({ children }) => <em>{children}</em>,
            ul: ({ children }) => (
              <Box as="ul" mb="3" style={{ paddingLeft: 20, lineHeight: 1.8 }}>{children}</Box>
            ),
            ol: ({ children }) => (
              <Box as="ol" mb="3" style={{ paddingLeft: 20, lineHeight: 1.8 }}>{children}</Box>
            ),
            li: ({ children }) => (
              <Text as="li" size="2" mb="1" style={{ lineHeight: 1.7 }}>{children}</Text>
            ),
            blockquote: ({ children }) => (
              <Box mb="3" pl="3" style={{ borderLeft: "3px solid var(--gray-6)", color: "var(--gray-11)" }}>
                {children}
              </Box>
            ),
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              return isBlock ? (
                <Box mb="3" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", overflowX: "auto" }}>
                  <pre style={{ margin: 0, fontSize: "var(--font-size-1)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.6 }}>
                    <code>{children}</code>
                  </pre>
                </Box>
              ) : (
                <code style={{ backgroundColor: "var(--gray-3)", padding: "1px 5px", borderRadius: "var(--radius-1)", fontSize: "0.9em", fontFamily: "var(--font-mono, monospace)" }}>
                  {children}
                </code>
              );
            },
            hr: () => <Box mb="4" style={{ borderTop: "1px solid var(--gray-4)" }} />,
          }}
        >
          {app.aiInterviewQuestions}
        </ReactMarkdown>
      </Box>
    </Card>
  );
}
