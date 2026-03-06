"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Text, Heading, Link as RadixLink } from "@radix-ui/themes";

export function MarkdownProse({ content }: { content: string }) {
  return (
    <div className="markdown-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <Heading size="5" mb="2">
              {children}
            </Heading>
          ),
          h2: ({ children }) => (
            <Heading size="4" mb="2" mt="4">
              {children}
            </Heading>
          ),
          h3: ({ children }) => (
            <Heading size="3" mb="1" mt="3">
              {children}
            </Heading>
          ),
          h4: ({ children }) => (
            <Heading size="2" mb="1" mt="2">
              {children}
            </Heading>
          ),
          p: ({ children }) => (
            <Text as="p" size="2" style={{ lineHeight: 1.7, marginBottom: 8 }}>
              {children}
            </Text>
          ),
          a: ({ href, children }) => (
            <RadixLink href={href ?? "#"} target="_blank" rel="noopener noreferrer">
              {children}
            </RadixLink>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 4 }}>
              <Text size="2" style={{ lineHeight: 1.7 }}>
                {children}
              </Text>
            </li>
          ),
          strong: ({ children }) => (
            <Text weight="bold" size="2">
              {children}
            </Text>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid var(--gray-6)",
                paddingLeft: 12,
                margin: "8px 0",
                color: "var(--gray-11)",
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: 8 }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "var(--font-size-2)",
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: "1px solid var(--gray-6)",
                padding: "6px 10px",
                textAlign: "left",
                fontWeight: 600,
                backgroundColor: "var(--gray-2)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: "1px solid var(--gray-6)",
                padding: "6px 10px",
              }}
            >
              {children}
            </td>
          ),
        }}
      />
    </div>
  );
}
