import { Box } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { LandingHero } from "@/components/landing-hero";
import { LandingPreview } from "@/components/landing-preview";
import { LandingFeatures } from "@/components/landing-features";

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
      <LandingHero />
      <div className={sectionDivider} />
      <LandingPreview />
      <div className={sectionDivider} />
      <LandingFeatures />
    </Box>
  );
}
