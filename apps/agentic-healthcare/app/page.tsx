import { AuthButton } from "@/components/auth-button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AnimatedStat } from "@/components/animated-stat";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Grid,
} from "@radix-ui/themes";
import {
  HeartPulse,
  FileUp,
  Calculator,
  TrendingUp,
  Gauge,
  MessageCircleQuestion,
  BookOpen,
  ClipboardList,
  FlaskConical,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const steps = [
  {
    icon: FileUp,
    title: "Upload",
    description:
      "Drop your blood test PDF. Our AI extracts every biomarker — CBC, CMP, lipids, liver, thyroid — in seconds.",
  },
  {
    icon: Calculator,
    title: "Compute",
    description:
      "We calculate 7 clinical ratios (TG/HDL, NLR, De Ritis, eGFR…) with peer-reviewed thresholds and risk ranges.",
  },
  {
    icon: TrendingUp,
    title: "Track",
    description:
      "Each panel becomes a 1024-dimensional health vector. Compare panels over time with cosine similarity and velocity alerts.",
  },
];

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

const research = [
  {
    stat: "87%",
    label: "sensitivity",
    description: "Ovarian cancer detection via longitudinal CA-125 trajectory",
    source: "Blyuss et al.",
  },
  {
    stat: "R²=0.97",
    label: "correlation",
    description: "eGFR estimation across 186,000 patients using ratio models",
    source: "Inker et al.",
  },
  {
    stat: "6×",
    label: "detection rate",
    description:
      "Insulin resistance identification via TG/HDL vs. fasting glucose alone",
    source: "Giannini et al.",
  },
  {
    stat: "1.64×",
    label: "mortality prediction",
    description: "All-cause mortality risk stratification using NLR thresholds",
    source: "Fest et al.",
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
    <Box style={{ minHeight: "100vh" }}>
      {/* Scroll progress bar */}
      <Box className="scroll-progress" />

      {/* ── Header ── */}
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
                <HeartPulse
                  size={20}
                  className="heartbeat"
                  style={{ color: "var(--indigo-9)" }}
                />
                <Heading size="4" style={{ letterSpacing: "-0.02em" }}>
                  Agentic Healthcare
                </Heading>
              </Flex>
              <Flex align="center" gap="5">
                <Flex
                  gap="5"
                  display={{ initial: "none", sm: "flex" }}
                >
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="#how-it-works"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      How It Works
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="#features"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      Features
                    </Link>
                  </Text>
                  <Text asChild size="2" color="gray" weight="medium">
                    <Link
                      href="#research"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      Research
                    </Link>
                  </Text>
                </Flex>
                <Suspense>
                  <AuthButton />
                </Suspense>
              </Flex>
            </Flex>
          </Container>
        </header>
      </Box>

      {/* ── Hero ── */}
      <Box className="hero-bg" py="9">
        <div className="pulse-rings">
          <span />
          <span />
          <span />
        </div>
        <Container size="2" style={{ position: "relative", zIndex: 1 }}>
          <Flex direction="column" align="center" gap="5" py="9">
            <Heading
              size="9"
              align="center"
              style={{
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                maxWidth: 720,
              }}
            >
              Your blood test is a snapshot.{" "}
              <span className="gradient-text">
                Your health is a story.
              </span>
            </Heading>
            <Text
              size="4"
              color="gray"
              align="center"
              style={{ maxWidth: 520 }}
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
        </Container>
      </Box>

      {/* ── Contrast Strip ── */}
      <Box py="8" style={{ background: "var(--gray-a2)" }}>
        <Container size="3">
          <Grid
            columns={{ initial: "1", sm: "2" }}
            gap="6"
            px="4"
          >
            <Box
              p="5"
              style={{
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--red-a4)",
                background: "var(--color-surface)",
              }}
            >
              <Text size="2" weight="bold" color="red" mb="3" asChild>
                <p>Without trajectory tracking</p>
              </Text>
              <Flex direction="column" gap="2" mt="3">
                {withoutTracking.map((item) => (
                  <Flex key={item} align="start" gap="2">
                    <X
                      size={16}
                      style={{
                        color: "var(--red-9)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
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
              style={{
                borderRadius: "var(--radius-3)",
                border: "1px solid var(--green-a4)",
                background: "var(--color-surface)",
              }}
            >
              <Text size="2" weight="bold" color="green" mb="3" asChild>
                <p>With Agentic Healthcare</p>
              </Text>
              <Flex direction="column" gap="2" mt="3">
                {withAgentic.map((item) => (
                  <Flex key={item} align="start" gap="2">
                    <Check
                      size={16}
                      style={{
                        color: "var(--green-9)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
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

      {/* ── How It Works ── */}
      <Box id="how-it-works" py="9">
        <Container size="3">
          <Flex direction="column" align="center" gap="7" px="4">
            <ScrollReveal>
              <Heading
                size="7"
                align="center"
                style={{ letterSpacing: "-0.03em" }}
              >
                From PDF to trajectory in 60 seconds
              </Heading>
            </ScrollReveal>
            <Grid
              columns={{ initial: "1", sm: "3" }}
              gap="6"
              width="100%"
              className="steps-grid"
            >
              {steps.map((step, i) => (
                <ScrollReveal key={step.title} delay={i * 150}>
                  <Flex
                    direction="column"
                    align="center"
                    gap="3"
                    p="5"
                    className="step-card"
                  >
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--radius-2)",
                        background: "var(--indigo-a3)",
                        color: "var(--indigo-11)",
                      }}
                    >
                      <step.icon size={22} />
                    </Flex>
                    <Heading size="4">{step.title}</Heading>
                    <Text size="2" color="gray" align="center">
                      {step.description}
                    </Text>
                  </Flex>
                </ScrollReveal>
              ))}
            </Grid>
          </Flex>
        </Container>
      </Box>

      {/* ── Features Grid ── */}
      <Box id="features" py="9" style={{ background: "var(--gray-a2)" }}>
        <Container size="3">
          <Flex direction="column" align="center" gap="7" px="4">
            <ScrollReveal>
              <Heading
                size="7"
                align="center"
                style={{ letterSpacing: "-0.03em" }}
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
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-2)",
                        background: feat.bg,
                        color: feat.color,
                      }}
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

      {/* ── Built on Science ── */}
      <Box id="research" py="9">
        <Container size="3">
          <Flex direction="column" align="center" gap="7" px="4">
            <ScrollReveal>
              <Heading
                size="7"
                align="center"
                style={{ letterSpacing: "-0.03em" }}
              >
                Built on science, not hype
              </Heading>
            </ScrollReveal>
            <Grid
              columns={{ initial: "1", sm: "2" }}
              gap="5"
              width="100%"
            >
              {research.map((r, i) => (
                <ScrollReveal key={r.source} delay={i * 120}>
                  <Flex
                    direction="column"
                    gap="2"
                    p="5"
                    className="research-card"
                  >
                    <Flex align="baseline" gap="2">
                      <Text
                        size="7"
                        weight="bold"
                        style={{
                          color: "var(--indigo-11)",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {r.stat}
                      </Text>
                      <Text size="2" color="gray">
                        {r.label}
                      </Text>
                    </Flex>
                    <Text size="2" color="gray">
                      {r.description}
                    </Text>
                    <Text size="1" color="gray" style={{ opacity: 0.6 }}>
                      {r.source}
                    </Text>
                  </Flex>
                </ScrollReveal>
              ))}
            </Grid>
            <ScrollReveal delay={500}>
              <Text size="2" color="gray" align="center">
                Backed by 8 peer-reviewed papers
              </Text>
            </ScrollReveal>
          </Flex>
        </Container>
      </Box>

      {/* ── Credibility Strip ── */}
      <Box
        style={{
          borderTop: "1px solid var(--gray-a3)",
          borderBottom: "1px solid var(--gray-a3)",
        }}
      >
        <Container size="3">
          <Grid columns={{ initial: "2", sm: "4" }} gap="4" py="7" px="4">
            <Flex direction="column" align="center" gap="1">
              <AnimatedStat value={8} />
              <Text size="2" color="gray">
                Peer-reviewed papers
              </Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <AnimatedStat value={7} />
              <Text size="2" color="gray">
                Clinical ratios tracked
              </Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <AnimatedStat value={1024} />
              <Text size="2" color="gray">
                Dimensional health vectors
              </Text>
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <AnimatedStat value={1} prefix="<" suffix=" min" />
              <Text size="2" color="gray">
                Processing time
              </Text>
            </Flex>
          </Grid>
        </Container>
      </Box>

      {/* ── Final CTA ── */}
      <Box className="cta-banner" py="9">
        <Container size="2">
          <Flex direction="column" align="center" gap="5">
            <ScrollReveal>
              <Heading
                size="7"
                align="center"
                style={{ letterSpacing: "-0.03em" }}
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

      {/* ── Footer ── */}
      <Box asChild style={{ borderTop: "1px solid var(--gray-a3)" }}>
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
                  <HeartPulse
                    size={16}
                    style={{ color: "var(--indigo-9)" }}
                  />
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
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    How It Works
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="#features"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    Features
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="#research"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    Research
                  </Link>
                </Text>
                <Text asChild size="2" color="gray">
                  <Link
                    href="/auth/sign-up"
                    style={{ textDecoration: "none", color: "inherit" }}
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
                <Text size="1" color="gray" style={{ opacity: 0.6 }}>
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
              style={{ borderTop: "1px solid var(--gray-a3)" }}
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
