"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

export function MarkdownProse({ content }: { content: string }) {
  const stripped = content.replace(/^# .+$/m, "");

  return (
    <div className="markdown-prose" style={{ maxWidth: 720 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={stripped}
        components={{
          h1: ({ children }) => {
            const id = slugify(extractText(children));
            return <h1 id={id}>{children}</h1>;
          },
          h2: ({ children }) => {
            const id = slugify(extractText(children));
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children }) => {
            const id = slugify(extractText(children));
            return <h3 id={id}>{children}</h3>;
          },
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return isExternal ? (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            ) : (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => {
            const text = extractText(children);
            let calloutType = "";
            if (/^(Key Takeaway|Takeaway)/i.test(text)) calloutType = "takeaway";
            else if (/^(Note|Info)/i.test(text)) calloutType = "note";
            else if (/^(Warning|Caution)/i.test(text)) calloutType = "warning";
            else if (/^(Tip|Pro tip|Best practice)/i.test(text)) calloutType = "tip";
            return (
              <blockquote className={calloutType ? `callout callout--${calloutType}` : undefined}>
                {children}
              </blockquote>
            );
          },
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
