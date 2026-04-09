"use client";

import { Suspense, useState, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import type { ReactElement } from "react";
import {
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

const LANG_LABELS: Record<string, string> = {
  jsx: "React", tsx: "React", react: "React",
  css: "CSS", scss: "CSS", sass: "CSS", less: "CSS",
  js: "JavaScript", javascript: "JavaScript",
  ts: "TypeScript", typescript: "TypeScript",
  html: "HTML", json: "JSON", bash: "Terminal", sh: "Terminal",
  sql: "SQL", python: "Python", py: "Python",
};

function langLabel(lang: string): string {
  return LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
}

/** Merge consecutive fenced code blocks into a single `codepair` block */
function groupCodeBlocks(md: string): string {
  return md.replace(
    /```(\w+)\n([\s\S]*?)```\n{1,3}```(\w+)\n([\s\S]*?)```/g,
    (_, l1, c1, l2, c2) =>
      `\`\`\`codepair\n${l1}\n${c1.trimEnd()}\n====CODESPLIT====\n${l2}\n${c2.trimEnd()}\n\`\`\``,
  );
}

/** Extract inline style="" attrs into class-based CSS rules (deduped) */
function extractInlineStyles(html: string): { cleanHtml: string; css: string } | null {
  let counter = 0;
  const styleToClass = new Map<string, string>();
  const rules: string[] = [];

  const cleanHtml = html.replace(/\s+style="([^"]*)"/g, (_, styleValue: string) => {
    let cls = styleToClass.get(styleValue);
    if (!cls) {
      counter++;
      cls = `s${counter}`;
      styleToClass.set(styleValue, cls);
      const props = styleValue
        .split(";")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((s: string) => `  ${s};`)
        .join("\n");
      rules.push(`.${cls} {\n${props}\n}`);
    }
    return ` class="${cls}"`;
  });

  if (counter === 0) return null;
  return { cleanHtml, css: rules.join("\n\n") };
}

function CodePanel({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="code-block-wrapper">
      <div className="code-block-bar">
        <div className="code-block-dots"><span /><span /><span /></div>
        <span className="code-block-lang">{langLabel(lang)}</span>
      </div>
      <pre style={{ margin: 0, padding: 16, overflowX: "auto", fontSize: "var(--font-size-1)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.7, backgroundColor: "var(--gray-2)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LivePreviewPanel({ html, css }: { html: string; css: string }) {
  const srcdoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#1a1a1a;padding:16px}
${css}</style></head><body>${html}</body></html>`;

  return (
    <div className="code-block-wrapper live-preview-wrapper">
      <div className="code-block-bar">
        <div className="code-block-dots"><span /><span /><span /></div>
        <span className="code-block-lang">Preview</span>
      </div>
      <iframe srcDoc={srcdoc} sandbox="allow-same-origin" title="Live preview" />
    </div>
  );
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function EditableCodePanel({ lang, value, onChange }: { lang: string; value: string; onChange: (v: string) => void }) {
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const updated = value.substring(0, start) + "  " + value.substring(end);
      onChange(updated);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  }, [value, onChange]);

  return (
    <div className="code-block-wrapper">
      <div className="code-block-bar">
        <div className="code-block-dots"><span /><span /><span /></div>
        <span className="code-block-lang">{langLabel(lang)}</span>
      </div>
      <textarea
        className="code-playground-textarea"
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={Math.max(4, value.split("\n").length)}
        spellCheck={false}
        wrap="off"
      />
    </div>
  );
}

function InteractiveCodePlayground({ initialHtml, initialCss }: { initialHtml: string; initialCss: string }) {
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const debouncedHtml = useDebouncedValue(html, 200);
  const debouncedCss = useDebouncedValue(css, 200);
  const dirty = html !== initialHtml || css !== initialCss;

  return (
    <Box mb="4" style={{ position: "relative" }}>
      {dirty && (
        <button
          className="code-playground-reset"
          onClick={() => { setHtml(initialHtml); setCss(initialCss); }}
        >
          Reset
        </button>
      )}
      <div className="code-triple-grid">
        <EditableCodePanel lang="html" value={html} onChange={setHtml} />
        <EditableCodePanel lang="css" value={css} onChange={setCss} />
        <LivePreviewPanel html={debouncedHtml} css={debouncedCss} />
      </div>
    </Box>
  );
}

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
      <Box px={{ initial: "4", md: "8" }} py="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
        <Skeleton height="600px" />
      </Box>
    );
  }

  if (error || !app) {
    return (
      <Box px={{ initial: "4", md: "8" }} py="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">{error ? "Error" : "Not Found"}</Heading>
            <Text color="gray">{error ?? "This application doesn\u2019t exist or you don\u2019t have access."}</Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Box>
    );
  }

  const content = app.aiInterviewQuestions;
  const processed = content ? groupCodeBlocks(content) : null;

  return (
    <Box px={{ initial: "4", md: "8" }} py={{ initial: "4", md: "8" }}>
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
      {processed ? (
        <Box className="interview-prep-md">
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
              pre: ({ children }) => {
                let lang = "";
                let rawText = "";
                const codeEl = children as ReactElement<{ className?: string; children?: string }>;
                if (codeEl?.props) {
                  const match = codeEl.props.className?.match(/language-(\w+)/);
                  if (match) lang = match[1];
                  rawText = String(codeEl.props.children || "").replace(/\n$/, "");
                }

                if (lang === "codepair") {
                  const parts = rawText.split("\n====CODESPLIT====\n");
                  const blocks = parts.map((part) => {
                    const lines = part.split("\n");
                    return { lang: lines[0], code: lines.slice(1).join("\n") };
                  });

                  const isHtmlCss =
                    blocks.length === 2 &&
                    blocks.some((b) => b.lang.toLowerCase() === "html") &&
                    blocks.some((b) => b.lang.toLowerCase() === "css");

                  if (isHtmlCss) {
                    const htmlBlock = blocks.find((b) => b.lang.toLowerCase() === "html")!;
                    const cssBlock = blocks.find((b) => b.lang.toLowerCase() === "css")!;
                    return <InteractiveCodePlayground initialHtml={htmlBlock.code} initialCss={cssBlock.code} />;
                  }

                  return (
                    <Box mb="4">
                      <div className="code-pair-grid">
                        {blocks.map((block, i) => (
                          <CodePanel key={i} lang={block.lang} code={block.code} />
                        ))}
                      </div>
                    </Box>
                  );
                }

                if (lang === "html") {
                  const extracted = extractInlineStyles(rawText);
                  if (extracted) {
                    return <InteractiveCodePlayground initialHtml={extracted.cleanHtml} initialCss={extracted.css} />;
                  }
                  return (
                    <Box mb="4">
                      <div className="code-pair-grid">
                        <CodePanel lang="html" code={rawText} />
                        <LivePreviewPanel html={rawText} css="" />
                      </div>
                    </Box>
                  );
                }

                return (
                  <Box mb="4">
                    <div className="code-block-wrapper">
                      <div className="code-block-bar">
                        <div className="code-block-dots"><span /><span /><span /></div>
                        {lang && <span className="code-block-lang">{langLabel(lang)}</span>}
                      </div>
                      <pre style={{ margin: 0, padding: 16, overflowX: "auto", fontSize: "var(--font-size-1)", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.7, backgroundColor: "var(--gray-2)" }}>
                        {children}
                      </pre>
                    </div>
                  </Box>
                );
              },
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) return <code>{children}</code>;
                return (
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
            {processed}
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
    </Box>
  );
}

export default function PrepPage() {
  return (
    <Suspense fallback={
      <Box px={{ initial: "4", md: "8" }} py="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 300 }} />
        <Skeleton height="600px" />
      </Box>
    }>
      <PrepPageInner />
    </Suspense>
  );
}
