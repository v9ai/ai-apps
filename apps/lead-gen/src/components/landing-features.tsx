"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  MixerVerticalIcon,
  DesktopIcon,
} from "@radix-ui/react-icons";

// ── Accent system ────────────────────────────────────────────────────────────

const CARD_ACCENTS = [
  { token: "accent.primary", raw: "#3E63DD", glow: "rgba(62, 99, 221, 0.25)", dimBg: "rgba(62, 99, 221, 0.06)" },
  { token: "status.positive", raw: "#30A46C", glow: "rgba(48, 164, 108, 0.25)", dimBg: "rgba(48, 164, 108, 0.06)" },
  { token: "status.negative", raw: "#E5484D", glow: "rgba(229, 72, 77, 0.25)", dimBg: "rgba(229, 72, 77, 0.06)" },
];

const CARD_ICONS = [
  <MagnifyingGlassIcon key="search" width={18} height={18} />,
  <MixerVerticalIcon key="mixer" width={18} height={18} />,
  <DesktopIcon key="desktop" width={18} height={18} />,
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FeatureCardProps {
  title: string;
  description: string;
  details: string[];
  codeSnippet: string;
  index?: number;
}

// ── Code snippet component ───────────────────────────────────────────────────

function CodeSnippet({ code, accentRaw }: { code: string; accentRaw: string }) {
  return (
    <div
      className={css({
        mt: "4",
        p: "3",
        bg: "rgba(10, 10, 15, 0.6)",
        border: "1px solid",
        borderColor: "ui.border",
        fontFamily: "mono",
        fontSize: "2xs",
        lineHeight: "relaxed",
        color: "ui.secondary",
        overflow: "hidden",
        position: "relative",
      })}
    >
      {/* top bar */}
      <div
        className={flex({
          align: "center",
          gap: "2",
          mb: "2",
          pb: "2",
        })}
        style={{ borderBottom: `1px solid rgba(44, 44, 47, 0.5)` }}
      >
        <div
          className={css({ w: "5px", h: "5px", flexShrink: 0, opacity: 0.5 })}
          style={{ background: accentRaw }}
        />
        <span className={css({ fontSize: "2xs", color: "ui.dim", letterSpacing: "wide" })}>
          example
        </span>
      </div>
      <pre className={css({ whiteSpace: "pre-wrap", wordBreak: "break-all", m: 0 })}>
        {code.split("\n").map((line, i) => (
          <div key={i}>
            <span className={css({ color: "ui.dim", userSelect: "none", mr: "2" })}>
              {String(i + 1).padStart(2, " ")}
            </span>
            <CodeLine line={line} accentRaw={accentRaw} />
          </div>
        ))}
      </pre>
    </div>
  );
}

/** Minimal syntax coloring — keywords, strings, numbers, comments */
function CodeLine({ line, accentRaw }: { line: string; accentRaw: string }) {
  const keywords = /\b(const|let|import|from|async|await|return|new|function|if|else|for|of|in|true|false|null)\b/g;
  const strings = /(["'`])(?:(?!\1).)*?\1/g;
  const numbers = /\b(\d+\.?\d*)\b/g;
  const comments = /(\/\/.*)$/g;

  type Segment = { text: string; color: string; start: number; end: number };
  const segments: Segment[] = [];

  let match: RegExpExecArray | null;

  // comments first (highest priority)
  while ((match = comments.exec(line)) !== null) {
    segments.push({ text: match[0], color: "#5A5A5E", start: match.index, end: match.index + match[0].length });
  }

  // strings
  while ((match = strings.exec(line)) !== null) {
    segments.push({ text: match[0], color: "#30A46C", start: match.index, end: match.index + match[0].length });
  }

  // keywords
  while ((match = keywords.exec(line)) !== null) {
    segments.push({ text: match[0], color: accentRaw, start: match.index, end: match.index + match[0].length });
  }

  // numbers
  while ((match = numbers.exec(line)) !== null) {
    segments.push({ text: match[0], color: "#F5A623", start: match.index, end: match.index + match[0].length });
  }

  if (segments.length === 0) {
    return <span>{line}</span>;
  }

  // sort by start position, remove overlaps
  segments.sort((a, b) => a.start - b.start);
  const filtered: Segment[] = [];
  let lastEnd = 0;
  for (const seg of segments) {
    if (seg.start >= lastEnd) {
      filtered.push(seg);
      lastEnd = seg.end;
    }
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const seg of filtered) {
    if (seg.start > cursor) {
      parts.push(<span key={`t${cursor}`}>{line.slice(cursor, seg.start)}</span>);
    }
    parts.push(<span key={`s${seg.start}`} style={{ color: seg.color }}>{seg.text}</span>);
    cursor = seg.end;
  }
  if (cursor < line.length) {
    parts.push(<span key={`t${cursor}`}>{line.slice(cursor)}</span>);
  }
  return <>{parts}</>;
}

// ── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ title, description, details, codeSnippet, index = 0 }: FeatureCardProps) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const icon = CARD_ICONS[index % CARD_ICONS.length];

  return (
    <div
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderLeftWidth: "3px",
        bg: "ui.surface",
        transition: "transform 300ms cubic-bezier(0.16,1,0.3,1), box-shadow 300ms cubic-bezier(0.16,1,0.3,1), border-color 300ms ease",
        _hover: {
          transform: "translateY(-4px)",
          borderColor: "ui.borderHover",
        },
      })}
      style={{
        borderLeftColor: accent.raw,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${accent.glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className={css({ p: { base: "4", sm: "5" } })}>
        {/* ── Header with icon ── */}
        <div className={flex({ align: "center", gap: "3", mb: "3" })}>
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: "32px",
              h: "32px",
              flexShrink: 0,
              border: "1px solid",
              borderColor: "ui.border",
            })}
            style={{ background: accent.dimBg, color: accent.raw }}
          >
            {icon}
          </div>
          <h3
            className={css({
              fontSize: "lg",
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tight",
              lineHeight: "snug",
            })}
          >
            {title}
          </h3>
        </div>

        {/* ── Description ── */}
        <p
          className={css({
            fontSize: "sm",
            color: "ui.body",
            lineHeight: "relaxed",
            mb: "4",
          })}
        >
          {description}
        </p>

        {/* ── Bullet points with checkmarks ── */}
        <div className={flex({ direction: "column", gap: "2" })}>
          {details.map((detail) => (
            <div key={detail} className={flex({ align: "baseline", gap: "2" })}>
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  flexShrink: 0,
                  lineHeight: "normal",
                })}
                style={{ color: accent.raw }}
              >
                &#10003;
              </span>
              <p
                className={css({
                  fontSize: "xs",
                  color: "ui.secondary",
                  lineHeight: "normal",
                })}
              >
                {detail}
              </p>
            </div>
          ))}
        </div>

        {/* ── Code snippet ── */}
        <CodeSnippet code={codeSnippet} accentRaw={accent.raw} />
      </div>
    </div>
  );
}

// ── IntersectionObserver hook for stagger animation ──────────────────────────

function useStaggeredEntry(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

// ── Feature data ─────────────────────────────────────────────────────────────

const features: FeatureCardProps[] = [
  {
    title: "Reinforcement learning finds what keyword crawlers miss",
    description:
      "DQN with 448-dimensional state space and UCB1 multi-armed bandit learns which domains yield the best leads. 3\u00d7 harvest rate over baseline random crawling.",
    details: [
      "448-dim state encodes page structure, link density, and domain history",
      "UCB1 bandit balances exploration vs exploitation across 820 domains",
      "You get 3\u00d7 more relevant pages per crawl cycle, automatically",
    ],
    codeSnippet: `const agent = new DQNAgent({
  stateSize: 448,
  actionSpace: 820,
  bandit: 'ucb1',
  gamma: 0.99
});
const action = await agent.selectDomain(state);`,
  },
  {
    title: "ML ensemble, not a single model",
    description:
      "XGBoost handles 50% of scoring weight, logistic regression 25%, random forest 25%. Each model catches what the others miss \u2014 89.7% precision, 86.5% recall.",
    details: [
      "Ensemble outperforms any single model by 4-7% on precision-recall AUC",
      "SHAP explanations show why each lead scored high or low",
      "Conformal prediction gives calibrated confidence intervals on every score",
    ],
    codeSnippet: `const ensemble = new EnsembleScorer([
  { model: xgboost, weight: 0.50 },
  { model: logReg,  weight: 0.25 },
  { model: randFor, weight: 0.25 },
]);
const { score, shap } = ensemble.predict(lead);`,
  },
  {
    title: "Local-first \u2014 your data, your pipeline, your control",
    description:
      "SQLite graph + LanceDB vectors + ChromaDB embeddings \u2014 all local. No API calls to score leads \u2014 runs entirely on commodity hardware. $1,500/year total cost vs $5,400-13,200 for cloud alternatives.",
    details: [
      "~15 GB footprint for the entire pipeline with all indexes",
      "182ms per-lead end-to-end latency without LLM generation",
      "64-89% cost savings: commodity hardware vs cloud CRM subscriptions",
    ],
    codeSnippet: `import { db } from '@/db';
import { leads } from '@/db/schema';

const qualified = await db
  .select()
  .from(leads)
  .where(gte(leads.score, 0.85))
  .limit(100);`,
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function LandingFeatures() {
  const { ref, visible } = useStaggeredEntry(features.length);

  return (
    <section
      id="features"
      className={css({
        py: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* ── Section heading ── */}
        <div className={css({ mt: "2", mb: "8" })}>
          <div className={flex({ align: "center", gap: "2", mb: "3" })}>
            <div
              className={css({
                w: "16px",
                h: "2px",
                bg: "accent.primary",
              })}
            />
            <span
              className={css({
                fontSize: "2xs",
                fontWeight: "bold",
                color: "accent.primary",
                textTransform: "uppercase",
                letterSpacing: "editorial",
              })}
            >
              Differentiators
            </span>
          </div>
          <h2
            className={css({
              fontSize: { base: "2xl", md: "3xl" },
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tight",
              lineHeight: "snug",
            })}
          >
            Why Agentic Lead Gen
          </h2>
          <p
            className={css({
              fontSize: "base",
              color: "ui.tertiary",
              mt: "2",
              maxW: "620px",
              lineHeight: "relaxed",
            })}
          >
            Cloud CRMs are optimized for their margins, not your pipeline.
            Agentic Lead Gen reverses that — autonomous agents on your hardware,
            reinforcement learning over keyword matching, ML ensembles over single-model scoring.
          </p>
        </div>

        {/* ── Feature cards with stagger animation ── */}
        <div
          ref={ref}
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
            gap: "4",
            mb: "6",
          })}
        >
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={css({
                opacity: 0,
              })}
              style={
                visible
                  ? {
                      animation: `feature-card-enter 0.5s cubic-bezier(0.16,1,0.3,1) forwards`,
                      animationDelay: `${i * 150}ms`,
                    }
                  : undefined
              }
            >
              <FeatureCard {...feature} index={i} />
            </div>
          ))}
        </div>

        {/* ── CTA block ── */}
        <div
          className={css({
            py: "6",
            px: "6",
            border: "1px solid",
            borderColor: "accent.border",
            bg: "accent.subtle",
          })}
        >
          <div
            className={flex({
              direction: { base: "column", sm: "row" },
              align: { base: "start", sm: "center" },
              justify: "space-between",
              gap: "4",
            })}
          >
            <div>
              <p
                className={css({
                  fontSize: "base",
                  fontWeight: "bold",
                  color: "ui.heading",
                  letterSpacing: "snug",
                })}
              >
                Ready to deploy?
              </p>
              <p
                className={css({
                  fontSize: "sm",
                  mt: "1",
                  color: "ui.secondary",
                })}
              >
                Autonomous agents. 300 qualified leads per cycle. Fully local.
              </p>
            </div>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen#deploy"
                className={button({ variant: "solid", size: "md" })}
              >
                Deploy now
                <ArrowRightIcon width={14} height={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
