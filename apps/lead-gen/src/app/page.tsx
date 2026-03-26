import { Box } from "@radix-ui/themes";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { LandingPreview } from "@/components/landing-preview";

export default function HomePage() {
  return (
    <Box>
      <LandingHero />
      <LandingPreview />
      <LandingFeatures />
    </Box>
  );
}
