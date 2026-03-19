"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit, SKIP } from "unist-util-visit";
import type { Root, Table, TableRow, Link, Text, PhrasingContent, Strong, Parent } from "mdast";
import type { ReactNode } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/* ── shared helpers for scholar link visitors ──────────────────── */

const SCHOLAR = "https://scholar.google.com/scholar?q=";

function scholarQuery(...parts: (string | undefined)[]): string {
  return SCHOLAR + encodeURIComponent(parts.filter(Boolean).join(" "));
}

/** Words that look like author names but aren't */
const STOP_SET = new Set([
  "section", "phase", "step", "part", "chapter", "version",
  "table", "figure", "tier", "stage", "level", "act",
]);

function isStopWord(s: string): boolean {
  return STOP_SET.has(s.toLowerCase());
}

/** Accented-name-aware author pattern segment */
const AU = String.raw`[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F']+`;
const AU_COMPOUND = `${AU}(?:\\s*(?:&|and)\\s*${AU})?(?:\\s+et\\s+al\\.?)?`;

/** Parenthetical citation: (Author, Year) or (Author et al., Year) */
const PAREN_RE = new RegExp(
  `\\((${AU_COMPOUND}),\\s*(\\d{4})\\)`,
  "g",
);

/** Narrative citation: Author (Year) in running text */
const NARRATIVE_RE = new RegExp(
  `(${AU_COMPOUND})\\s+\\((\\d{4})\\)`,
  "g",
);

function validYear(y: number): boolean {
  return y >= 1950 && y <= 2030;
}

/** Create a Scholar link AST node wrapping some children */
function mkLink(url: string, children: PhrasingContent[]): Link {
  return { type: "link", url, children };
}

/** Check if a parent node type should skip linking */
function skipParent(parent: Parent | undefined): boolean {
  if (!parent) return false;
  const t = parent.type;
  return t === "link" || t === "heading" || t === "code" || t === "inlineCode";
}

/* ── remark plugin ─────────────────────────────────────────────── */

/** Remark plugin: auto-link paper titles & citations to Google Scholar */
function remarkScholarLinks() {
  return (tree: Root) => {
    /* ── Visitor 0: table Title columns (original) ───────────── */
    visit(tree, "table", (table: Table) => {
      const headerRow = table.children[0] as TableRow | undefined;
      if (!headerRow) return;

      let titleIndex = -1;
      for (let i = 0; i < headerRow.children.length; i++) {
        const cell = headerRow.children[i];
        const text = cell.children
          .filter((c): c is Text => c.type === "text")
          .map((c) => c.value)
          .join("");
        if (text.toLowerCase().trim() === "title") {
          titleIndex = i;
          break;
        }
      }

      if (titleIndex === -1) return;

      for (let r = 1; r < table.children.length; r++) {
        const row = table.children[r];
        const cell = row.children[titleIndex];
        if (!cell) continue;
        if (cell.children.some((c) => c.type === "link")) continue;

        const fullText = cell.children
          .filter((c): c is Text => c.type === "text")
          .map((c) => c.value)
          .join("");
        if (fullText.trim().length < 10) continue;

        const link: Link = {
          type: "link",
          url: `https://scholar.google.com/scholar?q=${encodeURIComponent(fullText.trim())}`,
          children: cell.children as PhrasingContent[],
        };
        cell.children = [link];
      }
    });

    /* ── Visitor A: parenthetical citations in text nodes ─────── */
    visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;
      if (skipParent(parent) || parent.type === "strong") return;

      PAREN_RE.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let last = 0;
      let matched = false;
      let m: RegExpExecArray | null;

      while ((m = PAREN_RE.exec(node.value)) !== null) {
        const authors = m[1];
        const year = parseInt(m[2], 10);
        if (!validYear(year) || isStopWord(authors)) continue;

        matched = true;
        if (m.index > last) {
          parts.push({ type: "text", value: node.value.slice(last, m.index) } as Text);
        }
        parts.push(
          mkLink(scholarQuery(authors, String(year)), [
            { type: "text", value: m[0] } as Text,
          ]),
        );
        last = m.index + m[0].length;
      }

      if (!matched) return;
      if (last < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(last) } as Text);
      }
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length] as unknown as ReturnType<typeof visit>;
    });

    /* ── Visitor B: narrative citations Author (Year) ────────── */
    visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;
      if (skipParent(parent) || parent.type === "strong") return;

      NARRATIVE_RE.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let last = 0;
      let matched = false;
      let m: RegExpExecArray | null;

      while ((m = NARRATIVE_RE.exec(node.value)) !== null) {
        const authors = m[1];
        const year = parseInt(m[2], 10);
        if (!validYear(year) || isStopWord(authors)) continue;

        // Skip if this is also a parenthetical citation (already handled)
        // Parenthetical has format "(Author, Year)" — narrative is "Author (Year)"
        // Check the char before: if it's "(" this is a parenthetical, skip
        const charBefore = m.index > 0 ? node.value[m.index - 1] : "";
        if (charBefore === "(") continue;

        matched = true;
        if (m.index > last) {
          parts.push({ type: "text", value: node.value.slice(last, m.index) } as Text);
        }
        parts.push(
          mkLink(scholarQuery(authors, String(year)), [
            { type: "text", value: m[0] } as Text,
          ]),
        );
        last = m.index + m[0].length;
      }

      if (!matched) return;
      if (last < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(last) } as Text);
      }
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length] as unknown as ReturnType<typeof visit>;
    });

    /* ── Visitor C: bold author-year  **Author (Year)** ──────── */
    visit(tree, "strong", (node: Strong, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;
      if (parent.type === "link" || parent.type === "heading") return;

      // Extract text from inside the strong node
      const innerText = node.children
        .filter((c): c is Text => c.type === "text")
        .map((c) => c.value)
        .join("");

      const boldRe = new RegExp(`^(${AU_COMPOUND})\\s*\\((\\d{4})\\)$`);
      const bm = innerText.match(boldRe);
      if (!bm) return;

      const authors = bm[1];
      const year = parseInt(bm[2], 10);
      if (!validYear(year) || isStopWord(authors)) return;

      // Check if the next sibling has a ': "Title..."' — use for better query
      let title: string | undefined;
      const nextSibling = parent.children[index + 1];
      if (nextSibling && nextSibling.type === "text") {
        const tm = (nextSibling as Text).value.match(/^:\s*"([^"]+)"/);
        if (tm) title = tm[1];
        // Also try ": Description text"
        if (!title) {
          const dm = (nextSibling as Text).value.match(/^:\s*(.{15,})/);
          if (dm) title = dm[1].slice(0, 80);
        }
      }

      const url = scholarQuery(title || authors, authors, String(year));
      const link = mkLink(url, [node as unknown as PhrasingContent]);
      parent.children[index] = link as unknown as PhrasingContent;
      return [SKIP, index + 1] as unknown as ReturnType<typeof visit>;
    });
  };
}

export function MarkdownProse({ content }: { content: string }) {
  const stripped = content.replace(/^# .+$/m, "");

  return (
    <div className="markdown-prose" style={{ maxWidth: 720 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkScholarLinks]}
        children={stripped}
        components={{
          h1: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h1 id={id}>
                <a href={`#${id}`} className="heading-anchor" aria-hidden="true">#</a>
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h2 id={id}>
                <a href={`#${id}`} className="heading-anchor" aria-hidden="true">#</a>
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(extractText(children));
            return (
              <h3 id={id}>
                <a href={`#${id}`} className="heading-anchor" aria-hidden="true">#</a>
                {children}
              </h3>
            );
          },
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return isExternal ? (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
                <span className="external-link-icon" aria-hidden="true">&#8599;</span>
              </a>
            ) : (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote>
              <div className="blockquote-border" aria-hidden="true" />
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }) => {
            // Extract language from the code child
            let lang = "";
            if (children && typeof children === "object" && "props" in (children as unknown as Record<string, unknown>)) {
              const codeProps = (children as unknown as { props: { className?: string } }).props;
              const match = codeProps?.className?.match(/language-(\w+)/);
              if (match) lang = match[1];
            }

            return (
              <div className="code-block-wrapper">
                <div className="code-block-bar">
                  <div className="code-block-dots">
                    <span /><span /><span />
                  </div>
                  {lang && <span className="code-block-lang">{lang}</span>}
                </div>
                <pre {...props}>{children}</pre>
              </div>
            );
          },
        }}
      />
    </div>
  );
}
