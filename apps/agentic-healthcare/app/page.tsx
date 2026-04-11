import { AuthButton } from "@/components/auth-button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ResearchSection } from "@/components/research-section";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Grid,
} from "@radix-ui/themes";
import { Logo } from "@/components/logo";
import {
  TrendingUp,
  Gauge,
  MessageCircleQuestion,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Check,
  X,
  Github,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { css } from "styled-system/css";

const features = [
  {
    icon: FlaskConical,
    color: "var(--green-9)",
    bg: "var(--green-a3)",
    title: "Clinical Ratios",
    description:
      "7 ratios with published thresholds — TG/HDL, NLR, PLR, De Ritis, BUN/Creatinine, eGFR, Albumin/Globulin.",
  },
  {
    icon: TrendingUp,
    color: "var(--indigo-9)",
    bg: "var(--indigo-a3)",
    title: "Health Trajectory",
    description:
      "1024-dimensional vectors capture your full biomarker profile. Cosine similarity tracks drift between panels.",
  },
  {
    icon: Gauge,
    color: "var(--orange-9)",
    bg: "var(--orange-a3)",
    title: "Velocity Alerts",
    description:
      "Per-day rate-of-change for every marker. Catch accelerating trends before they become clinical findings.",
  },
  {
    icon: MessageCircleQuestion,
    color: "var(--violet-9)",
    bg: "var(--violet-a3)",
    title: "AI Health Q&A",
    description:
      "Ask natural language questions about your results. Get answers grounded in your actual lab values.",
  },
  {
    icon: BookOpen,
    color: "var(--cyan-9)",
    bg: "var(--cyan-a3)",
    title: "Condition Research",
    description:
      "Semantic Scholar integration surfaces peer-reviewed papers relevant to your specific biomarker patterns.",
  },
  {
    icon: ClipboardList,
    color: "var(--blue-9)",
    bg: "var(--blue-a3)",
    title: "Full Health Record",
    description:
      "Track conditions, medications, symptoms, and appointments alongside your lab results in one place.",
  },
];

const withoutTracking = [
  "Isolated snapshots with no context",
  "Missed trends between normal ranges",
  'Generic "within range" reassurances',
  "No velocity — can't see acceleration",
];

const withAgentic = [
  "Longitudinal trajectory across every panel",
  "7 clinical ratios with published thresholds",
  "1024-dim vectors detect subtle pattern shifts",
  "Per-day velocity catches accelerating trends",
];

export default function Home() {
  return (
    <Box className={css({ minHeight: "100vh" })}>
      {/* Scroll progress bar */}
      <Box className="scroll-progress" />

      {/* ── Header ── */}
      <Box
        asChild
        className={css({
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--gray-a4)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--indigo-2) 60%, transparent) 0%, color-mix(in srgb, var(--color-background) 85%, transparent) 100%)",
          backdropFilter: "blur(12px)",
        })}
      >
        <header>
          <Container size="3">
            <Flex justify="between" align="center" py="3" px="4">
              <Flex align="center" gap="2">
                <Logo size={20} />
                <Heading
                  size="4"
                  className={css({ letterSpacing: "-0.02em" })}
                >
                  Agentic Healthcare
                </Heading>
              </Flex>
              <Flex align="center" gap="5">
                <Flex gap="5" display={{ initial: "none", sm: "flex" }}>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="/how-it-works"
                      className={css({ textDecoration: "none", color: "inherit" })}
                    >
                      How It Works
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="#features"
                      className={css({ textDecoration: "none", color: "inherit" })}
                    >
                      Features
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="#research"
                      className={css({ textDecoration: "none", color: "inherit" })}
                    >
                      Research
                    </Link>
                  </Text>
                </Flex>
                <a
                  href="https://github.com/v9ai/ai-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({ color: "var(--gray-a11)", display: "flex" })}
                >
                  <Github size={20} />
                </a>
                <Suspense>
                  <AuthButton />
                </Suspense>
              </Flex>
            </Flex>
          </Container>
        </header>
      </Box>

      {/* ── Hero (full-width, no Container) ── */}
      <Box className={css({ position: "relative", width: "100%" })}>
        <Box className="hero-bg" py="9">
          <div className="pulse-rings">
            <span />
            <span />
            <span />
          </div>
          <Flex
            direction="column"
            align="center"
            gap="5"
            py="9"
            px="4"
            className={css({ position: "relative", zIndex: 1 })}
          >
            <Heading
              size="9"
              align="center"
              className={css({
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                maxWidth: "720px",
                fontSize: "clamp(2rem, 6vw, 4rem)",
              })}
            >
              Your blood test is a snapshot.{" "}
              <span className="gradient-text">Your health is a story.</span>
            </Heading>
            <Text
              size="4"
              color="gray"
              align="center"
              className={css({ maxWidth: "520px" })}
            >
              Upload your blood panels. Track 7 clinical ratios over time. See
              where your health is heading before your doctor does.
            </Text>
            <Flex gap="3" mt="2" wrap="wrap" justify="center">
              <Button size="3" asChild className="cta-button">
                <Link href="/auth/sign-up">Start Tracking — Free</Link>
              </Button>
              <Button
                size="3"
                variant="outline"
                asChild
                className="cta-button"
              >
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </Flex>

            <Box className="trajectory-line" mt="4" />

            <Flex className="floating-badges" mt="2">
              <span className="floating-badge">TG/HDL: 1.23 · optimal</span>
              <span className="floating-badge">NLR: 2.8 · borderline</span>
              <span className="floating-badge">92.4% similarity</span>
              <span className="floating-badge">De Ritis: 0.91 · optimal</span>
            </Flex>
          </Flex>
        </Box>
      </Box>

      {/* ── Contrast Strip ── */}
      <Box py="8" className={css({ background: "var(--gray-a2)" })}>
        <Container size="3">
          <Grid columns={{ initial: "1", sm: "2" }} gap="6" px="4">
            <Box
              p="5"
              className={css({
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--red-a4)",
                background: "var(--color-surface)",
              })}
            >
              <Text size="2" weight="bold" color="red" mb="3" asChild>
                <p>Without trajectory tracking</p>
              </Text>
              <Flex direction="column" gap="2" mt="3">
                {withoutTracking.map((item) => (
                  <Flex key={item} align="start" gap="2">
                    <X
                      size={16}
                      className={css({
                        color: "var(--red-9)",
                        flexShrink: 0,
                        marginTop: "2px",
                      })}
                    />
                    <Text size="2" color="gray">
                      {item}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
            <Box
              p="5"
              className={css({
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--green-a4)",
                background: "var(--color-surface)",
              })}
            >
              <Text size="2" weight="bold" color="green" mb="3" asChild>
                <p>With Agentic Healthcare</p>
              </Text>
              <Flex direction="column" gap="2" mt="3">
                {withAgentic.map((item) => (
                  <Flex key={item} align="start" gap="2">
                    <Check
                      size={16}
                      className={css({
                        color: "var(--green-9)",
                        flexShrink: 0,
                        marginTop: "2px",
                      })}
                    />
                    <Text size="2" color="gray">
                      {item}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* ── Features Grid ── */}
      <Box id="features" py="9" className={css({ background: "var(--gray-a2)" })}>
        <Container size="3">
          <Flex direction="column" align="center" gap="7" px="4">
            <ScrollReveal>
              <Heading
                size="7"
                align="center"
                className={css({ letterSpacing: "-0.03em" })}
              >
                Everything your blood test should tell you
              </Heading>
            </ScrollReveal>
            <Grid
              columns={{ initial: "1", sm: "2", md: "3" }}
              gap="5"
              width="100%"
            >
              {features.map((feat, i) => (
                <ScrollReveal key={feat.title} delay={i * 100}>
                  <Flex
                    direction="column"
                    gap="3"
                    p="5"
                    className="feature-card"
                  >
                    <Flex
                      align="center"
                      justify="center"
                      className={css({
                        width: "40px",
                        height: "40px",
                        borderRadius: "var(--radius-2)",
                        background: feat.bg,
                        color: feat.color,
                      })}
                    >
                      <feat.icon size={20} />
                    </Flex>
                    <Heading size="3">{feat.title}</Heading>
                    <Text size="2" color="gray">
                      {feat.description}
                    </Text>
                  </Flex>
                </ScrollReveal>
              ))}
            </Grid>
          </Flex>
        </Container>
      </Box>

      {/* ── How It Works / Research ── */}
      <Box id="how-it-works" py="9">
        <ResearchSection />
      </Box>

      {/* ── Final CTA ── */}
      <Box className={css({ _before: { content: '""' } })}>
        <Box className="cta-banner" py="9">
          <Container size="2">
            <Flex direction="column" align="center" gap="5">
              <ScrollReveal>
                <Heading
                  size="7"
                  align="center"
                  className={css({ letterSpacing: "-0.03em" })}
                >
                  Your next blood test deserves more than a glance
                </Heading>
              </ScrollReveal>
              <Text size="3" color="gray" align="center">
                Free to use. No credit card required.
              </Text>
              <Flex gap="3" wrap="wrap" justify="center">
                <Button size="3" asChild className="cta-button">
                  <Link href="/auth/sign-up">Start Tracking — Free</Link>
                </Button>
                <Button
                  size="3"
                  variant="outline"
                  asChild
                  className="cta-button"
                >
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
              </Flex>
            </Flex>
          </Container>
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box
        asChild
        className={css({ borderTop: "1px solid var(--gray-a3)" })}
      >
        <footer>
          <Container size="3">
            <Grid
              columns={{ initial: "1", sm: "3" }}
              gap="6"
              py="8"
              px="4"
            >
              {/* Brand */}
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Logo size={16} />
                  <Text size="3" weight="bold">
                    Agentic Healthcare
                  </Text>
                </Flex>
                <Text size="2" color="gray">
                  Longitudinal blood test intelligence. Turn snapshots into
                  trajectories.
                </Text>
              </Flex>

              {/* Product links */}
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Product
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="#how-it-works"
                    className={css({ textDecoration: "none", color: "inherit" })}
                  >
                    How It Works
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="#features"
                    className={css({ textDecoration: "none", color: "inherit" })}
                  >
                    Features
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="#research"
                    className={css({ textDecoration: "none", color: "inherit" })}
                  >
                    Research
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="/auth/sign-up"
                    className={css({ textDecoration: "none", color: "inherit" })}
                  >
                    Get Started
                  </Link>
                </Text>
              </Flex>

              {/* Clinical info */}
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Clinical
                </Text>
                <Text size="2" color="gray">
                  7 ratios · 8 peer-reviewed papers
                </Text>
                <Text
                  size="1"
                  color="gray"
                  className={css({ opacity: 0.6 })}
                >
                  Not medical advice. Consult your physician for clinical
                  decisions.
                </Text>
              </Flex>
            </Grid>

            {/* Bottom bar */}
            <Flex
              justify="between"
              align="center"
              py="4"
              px="4"
              className={css({ borderTop: "1px solid var(--gray-a3)" })}
            >
              <Text size="1" color="gray">
                © 2026 Agentic Healthcare
              </Text>
              <Text size="1" color="gray">
                Powered by AI
              </Text>
            </Flex>
          </Container>
        </footer>
      </Box>
    </Box>
  );
}
