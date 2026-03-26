import { Box } from "@radix-ui/themes";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";

export default function HomePage() {
  return (
    <Box>
      <LandingHero />
      <LandingFeatures />
    </Box>
  );
}
