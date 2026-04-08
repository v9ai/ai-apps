"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { badge } from "@/recipes/badge";
import { ArrowRightIcon } from "@radix-ui/react-icons";

const CARD_ACCENTS = [
  "accent.primary",
  "status.positive",
  "#E5484D",
];

const CARD_ACCENT_RAW = [
  "#3E63DD",
  "#30A46C",
  "#E5484D",
];

interface FeatureCardProps {
  title: string;
  description: string;
  details: string[];
  index?: number;
}

function FeatureCard({ title, description, details, index = 0 }: FeatureCardProps) {
  const accentRaw = CARD_ACCENT_RAW[index % CARD_ACCENT_RAW.length];
  return (
    <div
      className={css({
        borderRadius: "0",
        boxShadow: "none",
        border: "1px solid",
        borderColor: "ui.border",
        borderLeftWidth: "3px",
        borderLeftColor: CARD_ACCENTS[index % CARD_ACCENTS.length],
        bg: "ui.surface",
      })}
    >
      <div
        className={css({
          p: { base: "3", sm: "4" },
        })}
      >
        <h3
          className={css({
            fontSize: "lg",
            fontWeight: "bold",
            color: "ui.heading",
            letterSpacing: "tight",
            lineHeight: "snug",
            mb: "3",
          })}
        >
          {title}
        </h3>
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
        <div className={flex({ direction: "column", gap: "2" })}>
          {details.map((detail) => (
            <div key={detail} className={flex({ align: "baseline", gap: "2" })}>
              <div
                className={css({
                  w: "4px",
                  h: "4px",
                  flexShrink: 0,
                  mt: "6px",
                  opacity: 0.6,
                })}
                style={{ background: accentRaw }}
              />
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
      </div>
    </div>
  );
}

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
  },
  {
    title: "ML ensemble, not a single model",
    description:
      "XGBoost handles 50% of scoring weight, logistic regression 25%, random forest 25%. each model catches what the others miss \u2014 89.7% precision, 86.5% recall.",
    details: [
      "Ensemble outperforms any single model by 4-7% on precision-recall AUC",
      "SHAP explanations show why each lead scored high or low",
      "Conformal prediction gives calibrated confidence intervals on every score",
    ],
  },
  {
    title: "Local-first \u2014 your data, your pipeline, your control",
    description:
      "SQLite graph + LanceDB vectors + ChromaDB embeddings \u2014 all local. no API calls to score leads \u2014 Agentic Lead Gen runs entirely on commodity hardware. $1,500/year total cost vs $5,400-13,200 for cloud alternatives.",
    details: [
      "~15 GB footprint for the entire pipeline with all indexes",
      "182ms per-lead end-to-end latency without LLM generation",
      "64-89% cost savings: commodity hardware vs cloud CRM subscriptions",
    ],
  },
];

export function LandingFeatures() {
  return (
    <section
      id="features"
      className={css({
        py: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* -- heading -- */}
        <div className={css({ mt: "2", mb: "6" })}>
          <h2
            className={css({
              fontSize: "xl",
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tight",
            })}
          >
            Why Agentic Lead Gen
          </h2>
          <p
            className={css({
              fontSize: "base",
              color: "ui.tertiary",
              mt: "2",
              maxW: "560px",
            })}
          >
            Cloud CRMs are optimized for their margins, not your pipeline.
            Agentic Lead Gen reverses that — autonomous agents on your hardware, working 24/7.
          </p>
        </div>

        {/* -- feature cards -- */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
            gap: "4",
            mb: "6",
          })}
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </div>

        {/* -- CTA block -- */}
        <div
          className={css({
            py: "6",
            px: "6",
            border: "1px solid",
            borderColor: "accent.border",
            borderRadius: "0",
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
