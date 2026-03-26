import { Box } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { LandingNav } from "@/components/landing-nav";
import { LandingHero } from "@/components/landing-hero";
import { LandingPipeline } from "@/components/landing-pipeline";
import { LandingPreview } from "@/components/landing-preview";
import { LandingFeatures } from "@/components/landing-features";
import { LandingBuilder } from "@/components/landing-builder";
import { LandingClosing } from "@/components/landing-closing";
import { LandingFooter } from "@/components/landing-footer";

/**
 * Landing page -- narrative arc: what -> how -> proof -> why -> action.
 *
 * 1. Hero:     Value proposition + trust badges + contextual stats + CTA pair
 * 2. Pipeline: How it works -- 4-stage visualization
 * 3. Preview:  Proof -- live pipeline output with real leads
 * 4. Builder:  Human element -- "built by" attribution with mission context
 * 5. Features: Differentiators -- multi-model, real-time, vector matching
 * 6. Closing:  Decision point -- dual CTAs + tech stack + open source
 *
 * Navigation improvements:
 * - LandingNav: sticky header with scroll progress + section anchors + site links
 * - LandingFooter: sitemap with quick links + back-to-top
 * - Each section has an `id` attribute for scroll-to navigation
 *
 * Gradient dividers at major narrative transitions create visual
 * breathing room and signal a shift in content type to the reader.
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
      <LandingPreview />
      <LandingBuilder />
      <div className={sectionDivider} />
      <LandingFeatures />
      <LandingClosing />
      <LandingFooter />
    </Box>
  );
}
