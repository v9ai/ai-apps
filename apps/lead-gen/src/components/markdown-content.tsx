"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";

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
        <p
          key={key++}
          className={css({ fontSize: "sm", lineHeight: "relaxed", whiteSpace: "pre-wrap", color: "ui.body" })}
        >
          {renderTextWithBold(textSegment)}
        </p>
      );
    }

    const codeContent = match[2];
    segments.push(
      <div
        key={key++}
        className={css({
          bg: "ui.surface",
          p: "12px 16px",
          overflowX: "auto",
          my: "1",
        })}
      >
        <pre
          className={css({ fontSize: "sm", lineHeight: "normal", m: "0", fontFamily: "mono", whiteSpace: "pre" })}
        >
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textSegment = content.slice(lastIndex);
    segments.push(
      <p
        key={key++}
        className={css({ fontSize: "sm", lineHeight: "relaxed", whiteSpace: "pre-wrap", color: "ui.body" })}
      >
        {renderTextWithBold(textSegment)}
      </p>
    );
  }

  if (segments.length === 0) {
    segments.push(
      <p
        key={0}
        className={css({ fontSize: "sm", lineHeight: "relaxed", whiteSpace: "pre-wrap", color: "ui.body" })}
      >
        {renderTextWithBold(content)}
      </p>
    );
  }

  return (
    <div className={flex({ direction: "column", gap: "2" })}>
      {segments}
    </div>
  );
}
