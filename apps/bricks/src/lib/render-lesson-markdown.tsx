import { css } from "styled-system/css";
import React from "react";

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "h4"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "images"; items: { alt: string; url: string }[] };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("#### ")) {
      blocks.push({ kind: "h4", text: line.slice(5).trim() });
      i += 1;
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      const items: { alt: string; url: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
        if (!m) break;
        items.push({ alt: m[1], url: m[2] });
        i += 1;
      }
      blocks.push({ kind: "images", items });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    const paragraph: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^!\[/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "p", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            color: "lego.orange",
            textDecoration: "underline",
            _hover: { color: "#FF9F33" },
          })}
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={key++} className={css({ fontWeight: "700" })}>
          {match[5]}
        </strong>,
      );
    } else if (match[6]) {
      nodes.push(
        <em key={key++} className={css({ fontStyle: "italic" })}>
          {match[7]}
        </em>,
      );
    } else if (match[8]) {
      nodes.push(
        <code
          key={key++}
          className={css({
            fontFamily: "mono, monospace",
            fontSize: "0.9em",
            bg: "plate.surface",
            px: "1.5",
            py: "0.5",
            rounded: "sm",
            color: "ink.secondary",
          })}
        >
          {match[9]}
        </code>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function LessonMarkdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);

  return (
    <div
      className={css({
        display: "flex",
        flexDir: "column",
        gap: "4",
        color: "ink.secondary",
        fontSize: "md",
        lineHeight: "1.7",
      })}
    >
      {blocks.map((b, i) => {
        if (b.kind === "h2") {
          return (
            <h2
              key={i}
              className={css({
                fontSize: "xl",
                fontWeight: "800",
                fontFamily: "display",
                color: "ink.primary",
                letterSpacing: "-0.01em",
                mt: "4",
                mb: "1",
              })}
            >
              {renderInline(b.text)}
            </h2>
          );
        }
        if (b.kind === "h3") {
          return (
            <h3
              key={i}
              className={css({
                fontSize: "lg",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.primary",
                mt: "2",
              })}
            >
              {renderInline(b.text)}
            </h3>
          );
        }
        if (b.kind === "h4") {
          return (
            <h4
              key={i}
              className={css({
                fontSize: "sm",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.muted",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              })}
            >
              {renderInline(b.text)}
            </h4>
          );
        }
        if (b.kind === "p") {
          return (
            <p key={i} className={css({ m: "0" })}>
              {renderInline(b.text)}
            </p>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul
              key={i}
              className={css({
                m: "0",
                pl: "5",
                display: "flex",
                flexDir: "column",
                gap: "1.5",
                listStyle: "disc",
              })}
            >
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "images") {
          return (
            <div
              key={i}
              className={css({
                display: "grid",
                gridTemplateColumns: {
                  base: "1fr",
                  md: `repeat(${Math.min(b.items.length, 3)}, 1fr)`,
                },
                gap: "3",
                my: "2",
              })}
            >
              {b.items.map((img, j) => (
                <a
                  key={j}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({
                    display: "block",
                    rounded: "brick",
                    overflow: "hidden",
                    border: "1.5px solid",
                    borderColor: "plate.border",
                    bg: "white",
                    transition: "all 0.15s ease",
                    _hover: {
                      borderColor: "lego.orange",
                      transform: "translateY(-1px)",
                    },
                  })}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={css({
                      w: "100%",
                      h: "auto",
                      display: "block",
                    })}
                  />
                </a>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
