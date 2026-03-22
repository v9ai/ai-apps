"use client";

import { useState } from "react";
import { css } from "styled-system/css";

export function CodeViewer({
  code,
  filename,
}: {
  code: string;
  filename: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = code.split("\n");
  const displayLines = expanded ? lines : lines.slice(0, 30);
  const truncated = !expanded && lines.length > 30;

  return (
    <div>
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: "2",
        })}
      >
        <h3
          className={css({
            fontSize: "sm",
            fontWeight: "600",
            color: "ink.muted",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          })}
        >
          Source Code
        </h3>
        <span
          className={css({
            fontSize: "xs",
            color: "ink.faint",
            fontFamily: "mono",
          })}
        >
          {filename}
        </span>
      </div>
      <div
        className={css({
          bg: "plate.surface",
          rounded: "brick",
          border: "1px solid",
          borderColor: "plate.border",
          overflow: "hidden",
        })}
      >
        <pre
          className={css({
            fontSize: "xs",
            lineHeight: "relaxed",
            overflowX: "auto",
            p: "4",
          })}
        >
          <code>
            {displayLines.map((line, i) => (
              <div key={i} className={css({ display: "flex" })}>
                <span
                  className={css({
                    color: "ink.faint",
                    userSelect: "none",
                    w: "8",
                    flexShrink: 0,
                    textAlign: "right",
                    mr: "4",
                  })}
                >
                  {i + 1}
                </span>
                <span className={css({ color: "ink.secondary" })}>
                  {highlightLine(line)}
                </span>
              </div>
            ))}
          </code>
        </pre>
        {truncated && (
          <button
            onClick={() => setExpanded(true)}
            className={css({
              w: "100%",
              py: "2",
              fontSize: "xs",
              color: "ink.muted",
              bg: "plate.raised",
              borderTop: "1px solid",
              borderColor: "plate.border",
              cursor: "pointer",
              transition: "colors",
              _hover: { color: "ink.primary" },
            })}
          >
            Show all {lines.length} lines
          </button>
        )}
        {expanded && lines.length > 30 && (
          <button
            onClick={() => setExpanded(false)}
            className={css({
              w: "100%",
              py: "2",
              fontSize: "xs",
              color: "ink.muted",
              bg: "plate.raised",
              borderTop: "1px solid",
              borderColor: "plate.border",
              cursor: "pointer",
              transition: "colors",
              _hover: { color: "ink.primary" },
            })}
          >
            Collapse
          </button>
        )}
      </div>
    </div>
  );
}

function highlightLine(line: string): React.ReactNode {
  const commentIdx = line.indexOf("#");
  if (commentIdx >= 0) {
    const before = line.slice(0, commentIdx);
    const comment = line.slice(commentIdx);
    return (
      <>
        {highlightTokens(before)}
        <span style={{ color: "#807C76", fontStyle: "italic" }}>
          {comment}
        </span>
      </>
    );
  }
  return highlightTokens(line);
}

function highlightTokens(text: string): React.ReactNode {
  const keywords =
    /\b(from|import|if|elif|else|while|for|try|except|def|class|return|not|in|and|or|True|False|None|continue|break|pass)\b/g;
  const strings = /(["'])(?:(?!\1).)*\1/g;

  type Match = { index: number; length: number; text: string; type: string };
  const matches: Match[] = [];

  for (const m of text.matchAll(keywords)) {
    matches.push({
      index: m.index,
      length: m[0].length,
      text: m[0],
      type: "keyword",
    });
  }
  for (const m of text.matchAll(strings)) {
    matches.push({
      index: m.index,
      length: m[0].length,
      text: m[0],
      type: "string",
    });
  }

  matches.sort((a, b) => a.index - b.index);
  const filtered: Match[] = [];
  let maxEnd = 0;
  for (const m of matches) {
    if (m.index >= maxEnd) {
      filtered.push(m);
      maxEnd = m.index + m.length;
    }
  }

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const m of filtered) {
    if (m.index > lastIndex) {
      result.push(<span key={key++}>{text.slice(lastIndex, m.index)}</span>);
    }
    const color = m.type === "keyword" ? "#a78bfa" : "#4ade80";
    result.push(
      <span key={key++} style={{ color }}>
        {m.text}
      </span>
    );
    lastIndex = m.index + m.length;
  }

  if (lastIndex < text.length) {
    result.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return result.length > 0 ? result : text;
}
