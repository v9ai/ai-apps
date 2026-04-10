"use client";

import { Flex, Box, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";

function renderTextWithBold(text: string) {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  const segments: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textSegment = content.slice(lastIndex, match.index);
      segments.push(
        <Text
          key={key++}
          as="p"
          size="2"
          className={css({ lineHeight: "relaxed" })}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {renderTextWithBold(textSegment)}
        </Text>
      );
    }

    const codeContent = match[2];
    segments.push(
      <Box
        key={key++}
        style={{
          background: "var(--gray-3)",
          borderRadius: 6,
          padding: "12px 16px",
          overflowX: "auto",
          marginBlock: "4px",
        }}
      >
        <pre
          className={css({ fontSize: "sm", lineHeight: "normal" })}
          style={{
            margin: 0,
            fontFamily: "var(--font-mono, monospace)",
            whiteSpace: "pre",
          }}
        >
          <code>{codeContent}</code>
        </pre>
      </Box>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textSegment = content.slice(lastIndex);
    segments.push(
      <Text
        key={key++}
        as="p"
        size="2"
        className={css({ lineHeight: "relaxed" })}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {renderTextWithBold(textSegment)}
      </Text>
    );
  }

  if (segments.length === 0) {
    segments.push(
      <Text
        key={0}
        as="p"
        size="2"
        className={css({ lineHeight: "relaxed" })}
        style={{ whiteSpace: "pre-wrap" }}
      >
        {renderTextWithBold(content)}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {segments}
    </Flex>
  );
}
