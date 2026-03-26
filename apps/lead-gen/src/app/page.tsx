import { Box } from "@radix-ui/themes";
import { LandingHero } from "@/components/landing-hero";
import { LandingPipeline } from "@/components/landing-pipeline";
import { LandingPreview } from "@/components/landing-preview";
import { LandingFeatures } from "@/components/landing-features";
import { LandingClosing } from "@/components/landing-closing";

/**
 * Landing page — narrative arc: what → how → proof → why → action.
 *
 * 1. Hero:     Value proposition + social proof stats + single CTA
 * 2. Pipeline: How it works — 4-stage visualization
 * 3. Preview:  Proof — live pipeline output with real leads
 * 4. Features: Differentiators — multi-model, real-time, vector matching
 * 5. Closing:  Decision point — dual CTAs + tech stack + open source
 */
export default function HomePage() {
  return (
    <Box>
      <LandingHero />
      <LandingPipeline />
      <LandingPreview />
      <LandingFeatures />
      <LandingClosing />
    </Box>
  );
}
