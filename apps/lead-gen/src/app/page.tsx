import type { Metadata } from "next";
import { css } from "styled-system/css";
import { LandingNav } from "@/components/landing-nav";
import { LandingHero } from "@/components/landing-hero";
import { LandingPipeline } from "@/components/landing-pipeline";
import { LandingFeatures } from "@/components/landing-features";
import { LandingArchitecture } from "@/components/landing-architecture";
import { LandingClosing } from "@/components/landing-closing";
import { LandingFooter } from "@/components/landing-footer";
import { LandingMetrics } from "@/components/landing-metrics";

/**
 * B2B lead generation landing page — narrative arc: hook → how → proof → why → architecture → action.
 *
 * 1. Hero:         Value prop eyebrow + headline + subheadline + CTAs
 * 2. Pipeline:     7-module visualization (static cards, no ReactFlow)
 * 3. Metrics:      8-metric benchmark grid + builder attribution
 * 4. Features:     Differentiators — RL crawling, ensemble scoring, local-first
 * 5. Architecture: Tech stack layers + open source callout
 * 6. Closing:      Final CTA + email capture
 */

export const metadata: Metadata = {
  title: "Agentic Lead Gen — Autonomous B2B Lead Generation Pipeline",
  description:
    "Autonomous AI agents discover, enrich, score, and deliver qualified B2B leads end-to-end. Open-source, local-first, $1,500/year vs $13,200 cloud.",
  keywords: ["B2B lead generation", "autonomous AI agents", "local-first CRM", "agentic pipeline"],
  openGraph: {
    title: "Agentic Lead Gen — Autonomous B2B Lead Generation Pipeline",
    description:
      "Five specialized AI agents work 24/7 to discover companies, enrich profiles, find decision-maker contacts, and craft personalized outreach — without human intervention.",
    type: "website",
  },
};

const sectionDivider = css({
  width: "100%",
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, {colors.ui.border} 30%, {colors.accent.primary}/30 50%, {colors.ui.border} 70%, transparent 100%)",
  my: { base: "10", lg: "14" },
});

const interstitial = css({
  textAlign: "center",
  py: { base: "6", lg: "8" },
  fontSize: "sm",
  color: "ui.tertiary",
  letterSpacing: "snug",
});

export default function HomePage() {
  return (
    <div>
      <LandingNav />
      <LandingHero />
      <div className={sectionDivider} />
      <LandingPipeline />
      <p className={interstitial}>
        Seven modules. Zero cloud dependencies. Here are the numbers.
      </p>
      <LandingMetrics />
      <div className={sectionDivider} />
      <LandingFeatures />
      <div className={sectionDivider} />
      <LandingArchitecture />
      <LandingClosing />
      <LandingFooter />
    </div>
  );
}
