"use client";

import {
  Box,
  Flex,
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Grid,
  Section,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  ArrowRightIcon,
  BarChartIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

const STATS = [
  { value: "9,200+", label: "contacts" },
  { value: "460+", label: "companies" },
  { value: "1,800+", label: "jobs tracked" },
  { value: "27", label: "EU-remote matches" },
] as const;

const PIPELINE_STAGES = [
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "signal detection",
    description: "aggregate jobs from Greenhouse, Lever, and Ashby boards",
    badge: "ingest",
  },
  {
    icon: <CubeIcon width={20} height={20} />,
    title: "company enrichment",
    description: "AI-powered company profiling, funding, and stack analysis",
    badge: "enrich",
  },
  {
    icon: <PersonIcon width={20} height={20} />,
    title: "contact discovery",
    description: "find engineering managers and hiring decision makers",
    badge: "discover",
  },
  {
    icon: <EnvelopeClosedIcon width={20} height={20} />,
    title: "smart outreach",
    description: "personalized email generation grounded in company context",
    badge: "outreach",
  },
] as const;

function StageConnector() {
  return (
    <Flex
      align="center"
      justify="center"
      display={{ initial: "none", md: "flex" }}
      style={{ color: "var(--gray-8)", flexShrink: 0 }}
    >
      <ArrowRightIcon width={18} height={18} />
    </Flex>
  );
}

export function LandingHero() {
  return (
    <Section size="3" className="landing-hero-section" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <Container size="3">
        {/* --- top badge --- */}
        <Flex justify="center" mb="5">
          <Badge
            variant="outline"
            size="2"
            style={{
              border: "1px solid var(--gray-6)",
              background: "transparent",
              color: "var(--green-9)",
              padding: "4px 12px",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LightningBoltIcon width={12} height={12} />
            multi-model AI pipeline
          </Badge>
        </Flex>

        {/* --- headline --- */}
        <Heading
          as="h1"
          size="9"
          align="center"
          weight="bold"
          className="landing-hero-headline"
          style={{
            color: "var(--gray-12)",
            letterSpacing: "-0.025em",
            lineHeight: 1.08,
            maxWidth: 780,
            margin: "0 auto",
          }}
        >
          turn hiring signals into qualified leads
        </Heading>

        {/* --- subheadline --- */}
        <Text
          as="p"
          size="4"
          align="center"
          className="landing-hero-subheadline"
          style={{
            color: "var(--gray-10)",
            maxWidth: 520,
            margin: "20px auto 0",
            lineHeight: 1.65,
            letterSpacing: "-0.01em",
          }}
        >
          an AI pipeline that finds who's hiring before they post on job boards
          — aggregating signals, enriching companies, discovering contacts, and
          generating personalized outreach at scale.
        </Text>

        {/* --- CTA buttons --- */}
        <Flex justify="center" gap="3" mt="6">
          <Button
            asChild
            size="3"
            variant="solid"
            style={{
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.04em",
              padding: "10px 32px",
              cursor: "pointer",
            }}
          >
            <Link href="/how-it-works">
              explore pipeline
              <ArrowRightIcon width={14} height={14} />
            </Link>
          </Button>
          <Button
            asChild
            size="3"
            variant="ghost"
            style={{
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.04em",
              padding: "10px 32px",
              cursor: "pointer",
            }}
          >
            <Link href="/companies">browse leads</Link>
          </Button>
        </Flex>

        {/* --- stats row --- */}
        <Flex
          justify="center"
          gap="6"
          mt="8"
          wrap="wrap"
          style={{ borderTop: "1px solid var(--gray-6)", paddingTop: 24 }}
        >
          {STATS.map((stat) => (
            <Flex key={stat.label} direction="column" align="center" gap="2">
              <Text
                size="7"
                weight="bold"
                className="landing-hero-stat-value"
                style={{
                  color: "var(--gray-12)",
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </Text>
              <Text
                size="1"
                style={{
                  color: "var(--gray-9)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                {stat.label}
              </Text>
            </Flex>
          ))}
        </Flex>

        {/* --- pipeline visualization --- */}
        <Box mt="9">
          <Flex align="center" gap="2" mb="4">
            <BarChartIcon
              width={14}
              height={14}
              style={{ color: "var(--accent-9)" }}
            />
            <Text
              size="2"
              weight="medium"
              style={{
                color: "var(--gray-9)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              pipeline stages
            </Text>
          </Flex>

          {/* desktop: horizontal flow with connectors */}
          <Flex
            display={{ initial: "none", md: "flex" }}
            align="stretch"
            gap="3"
          >
            {PIPELINE_STAGES.map((stage, i) => (
              <Flex key={stage.title} align="stretch" gap="3" style={{ flex: 1, minWidth: 0 }}>
                {i > 0 && <StageConnector />}
                <Box
                  style={{
                    flex: 1,
                    background: "var(--gray-2)",
                    border: "1px solid var(--gray-6)",
                    padding: 20,
                  }}
                >
                  <Flex align="center" gap="2" mb="2">
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 32,
                        height: 32,
                        background: "var(--gray-3)",
                        border: "1px solid var(--gray-6)",
                        color: "var(--accent-9)",
                        flexShrink: 0,
                      }}
                    >
                      {stage.icon}
                    </Flex>
                    <Badge
                      variant="outline"
                      size="1"
                      style={{
                        border: "1px solid var(--gray-6)",
                        background: "transparent",
                        color: "var(--gray-9)",
                        fontWeight: 500,
                      }}
                    >
                      {stage.badge}
                    </Badge>
                  </Flex>
                  <Text
                    as="p"
                    size="2"
                    weight="medium"
                    style={{
                      color: "var(--gray-12)",
                      textTransform: "lowercase",
                      letterSpacing: "0.01em",
                      marginBottom: 8,
                    }}
                  >
                    {stage.title}
                  </Text>
                  <Text as="p" size="1" style={{ color: "var(--gray-10)", lineHeight: 1.6 }}>
                    {stage.description}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Flex>

          {/* mobile: vertical stack */}
          <Grid
            display={{ initial: "grid", md: "none" }}
            columns="1"
            gap="3"
          >
            {PIPELINE_STAGES.map((stage, i) => (
              <Box key={stage.title}>
                {i > 0 && (
                  <Flex
                    justify="center"
                    mb="3"
                    style={{ color: "var(--gray-8)", transform: "rotate(90deg)" }}
                  >
                    <ArrowRightIcon width={16} height={16} />
                  </Flex>
                )}
                <Box
                  style={{
                    background: "var(--gray-2)",
                    border: "1px solid var(--gray-6)",
                    padding: 20,
                  }}
                >
                  <Flex align="center" gap="2" mb="2">
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 32,
                        height: 32,
                        background: "var(--gray-3)",
                        border: "1px solid var(--gray-6)",
                        color: "var(--accent-9)",
                        flexShrink: 0,
                      }}
                    >
                      {stage.icon}
                    </Flex>
                    <Badge
                      variant="outline"
                      size="1"
                      style={{
                        border: "1px solid var(--gray-6)",
                        background: "transparent",
                        color: "var(--gray-9)",
                        fontWeight: 500,
                      }}
                    >
                      {stage.badge}
                    </Badge>
                  </Flex>
                  <Text
                    as="p"
                    size="2"
                    weight="medium"
                    style={{
                      color: "var(--gray-12)",
                      textTransform: "lowercase",
                      letterSpacing: "0.01em",
                      marginBottom: 8,
                    }}
                  >
                    {stage.title}
                  </Text>
                  <Text as="p" size="1" style={{ color: "var(--gray-10)", lineHeight: 1.6 }}>
                    {stage.description}
                  </Text>
                </Box>
              </Box>
            ))}
          </Grid>
        </Box>
      </Container>
    </Section>
  );
}
