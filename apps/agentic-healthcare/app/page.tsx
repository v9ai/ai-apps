import { AuthButton } from "@/components/auth-button";
import { Box, Container, Flex, Heading, Text, Button, Grid } from "@radix-ui/themes";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { WhyTrajectory } from "./protected/why-trajectory";

const stats = [
  { value: "8", label: "Peer-reviewed papers" },
  { value: "7", label: "Clinical ratios tracked" },
  { value: "1024", label: "Dimensional health vectors" },
  { value: "Per-day", label: "Velocity tracking" },
];

const steps = [
  { number: "1", title: "Upload", description: "Drop your blood test PDF" },
  { number: "2", title: "Analyze", description: "AI extracts markers, computes 7 clinical ratios" },
  { number: "3", title: "Track", description: "Watch your trajectory evolve across panels" },
];

export default function Home() {
  return (
    <Box style={{ minHeight: "100vh" }}>
      {/* Accent bar */}
      <Box
        style={{
          height: 3,
          background: "linear-gradient(90deg, var(--indigo-9), var(--indigo-6))",
        }}
      />

      {/* Nav */}
      <Box
        asChild
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--gray-a4)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <header>
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
              <Flex align="center" gap="2">
                <HeartPulse size={20} style={{ color: "var(--indigo-9)" }} />
                <Heading size="4" style={{ letterSpacing: "-0.02em" }}>
                  Agentic Healthcare
                </Heading>
              </Flex>
              <Suspense>
                <AuthButton />
              </Suspense>
            </Flex>
          </Container>
        </header>
      </Box>

      {/* Hero */}
      <Box className="hero-bg" py="9">
        <Container size="2">
          <Flex direction="column" align="center" gap="5" py="9">
            <Heading
              size="9"
              align="center"
              style={{ letterSpacing: "-0.04em", lineHeight: 1.1, maxWidth: 720 }}
            >
              Don&apos;t just test your blood.{" "}
              <span className="gradient-text">Track your trajectory.</span>
            </Heading>
            <Text
              size="4"
              color="gray"
              align="center"
              style={{ maxWidth: 480 }}
            >
              Upload panels. Compute clinical ratios. See where your health is heading.
            </Text>
            <Flex gap="3" mt="4" wrap="wrap" justify="center">
              <Button size="3" asChild className="cta-button">
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
              <Button size="3" variant="outline" asChild className="cta-button">
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Credibility Strip */}
      <Box style={{ borderTop: "1px solid var(--gray-a3)", borderBottom: "1px solid var(--gray-a3)" }}>
        <Container size="3">
          <Grid columns={{ initial: "2", sm: "4" }} gap="4" py="7" px="4">
            {stats.map((stat) => (
              <Flex key={stat.label} direction="column" align="center" gap="1">
                <Text size="8" weight="bold" style={{ letterSpacing: "-0.03em" }}>
                  {stat.value}
                </Text>
                <Text size="2" color="gray">
                  {stat.label}
                </Text>
              </Flex>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Box id="how-it-works" py="9">
        <Container size="3">
          <Flex direction="column" align="center" gap="7" px="4">
            <Heading size="7" align="center" style={{ letterSpacing: "-0.03em" }}>
              How it works
            </Heading>
            <Grid columns={{ initial: "1", sm: "3" }} gap="6" width="100%">
              {steps.map((step) => (
                <Flex
                  key={step.number}
                  direction="column"
                  align="center"
                  gap="3"
                  p="5"
                  style={{
                    borderRadius: "var(--radius-3)",
                    border: "1px solid var(--gray-a3)",
                    background: "var(--color-surface)",
                  }}
                >
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--accent-a3)",
                      color: "var(--accent-11)",
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {step.number}
                  </Flex>
                  <Heading size="4">{step.title}</Heading>
                  <Text size="2" color="gray" align="center">
                    {step.description}
                  </Text>
                </Flex>
              ))}
            </Grid>
          </Flex>
        </Container>
      </Box>

      {/* Why Trajectory */}
      <Container size="2">
        <Box py="8">
          <WhyTrajectory />
        </Box>
      </Container>

      {/* CTA Banner */}
      <Box className="cta-banner" py="9">
        <Container size="2">
          <Flex direction="column" align="center" gap="5">
            <Heading size="7" align="center" style={{ letterSpacing: "-0.03em" }}>
              Start tracking your health trajectory today
            </Heading>
            <Button size="3" asChild className="cta-button">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </Flex>
        </Container>
      </Box>

      {/* Footer */}
      <Box asChild style={{ borderTop: "1px solid var(--gray-a3)" }}>
        <footer>
          <Container size="3">
            <Flex justify="center" py="6">
              <Text size="2" color="gray">
                Agentic Healthcare
              </Text>
            </Flex>
          </Container>
        </footer>
      </Box>
    </Box>
  );
}
