import { Box } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { LandingNav } from "@/components/landing-nav";
import { LandingHero } from "@/components/landing-hero";
import { LandingPipeline } from "@/components/landing-pipeline";

import { LandingFeatures } from "@/components/landing-features";
import { LandingBuilder } from "@/components/landing-builder";
import { LandingClosing } from "@/components/landing-closing";
import { LandingFooter } from "@/components/landing-footer";
import { LandingMetrics } from "@/components/landing-metrics";

/**
 * Scrapus landing page — narrative arc: what → how → proof → why → action.
 *
 * 1. Hero:     Local-first B2B lead gen value prop + pipeline stats + CTA pair
 * 2. Pipeline: 7-module visualization (crawl → extract → resolve → score → report → evaluate)
 * 3. Metrics:  8-metric benchmark grid with scroll-triggered count-up animations
 * 4. Builder:  Human element — "built by" with mission context
 * 5. Features: Differentiators — RL crawling, ensemble scoring, local-first privacy
 * 6. Closing:  Decision point — deploy locally CTA + research updates signup
 *
 * Navigation:
 * - LandingNav: sticky header with scroll progress + section anchors
 * - LandingFooter: sitemap + manifesto + back-to-top
 */

const sectionDivider = css({
  width: "100%",
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, {colors.ui.border} 30%, {colors.accent.primary}/30 50%, {colors.ui.border} 70%, transparent 100%)",
  my: { base: "10", lg: "14" },
});

export default function HomePage() {
  return (
    <Box>
      <LandingNav />
      <LandingHero />
      <div className={sectionDivider} />
      <LandingPipeline />
      <LandingMetrics />
      <LandingBuilder />
      <div className={sectionDivider} />
      <LandingFeatures />
      <LandingClosing />
      <LandingFooter />
    </Box>
  );
}
