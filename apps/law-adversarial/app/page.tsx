import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Separator,
} from "@radix-ui/themes";
import {
  Swords,
  Shield,
  Gavel,
  BookOpen,
  Scale,
  Brain,
  Upload,
  Zap,
  FileCheck,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  FileSearch,
} from "lucide-react";
import Link from "next/link";
import { WhyThisWorks } from "./why-this-works";
import { getDemoSessions, getDemoFindings } from "@/lib/demo-data";

const agents = [
  { name: "Attacker", icon: Swords, color: "var(--crimson-9)", delay: 0 },
  { name: "Defender", icon: Shield, color: "var(--blue-9)", delay: 1 },
  { name: "Judge", icon: Gavel, color: "var(--amber-9)", delay: 2 },
  { name: "Citation Verifier", icon: BookOpen, color: "var(--green-9)", delay: 3 },
  { name: "Jurisdiction Expert", icon: Scale, color: "var(--purple-9)", delay: 4 },
  { name: "Brief Rewriter", icon: Brain, color: "var(--orange-9)", delay: 5 },
];

const stats = [
  { number: "58%", label: "GPT-4 legal hallucination rate", source: "Stanford HAI" },
  { number: "+15pp", label: "Accuracy boost from multi-agent debate", source: "ICML 2024" },
  { number: "300+", label: "Judges require AI citation verification", source: "Post Mata v. Avianca" },
  { number: "$31K", label: "Sanctions for AI-fabricated citations", source: "U.S. Courts 2023-2025" },
];

const steps = [
  {
    icon: Upload,
    title: "Upload Your Brief",
    description: "Paste or upload your legal brief. Our system accepts any jurisdiction, any practice area.",
  },
  {
    icon: Zap,
    title: "AI Stress Test",
    description: "Six specialized agents attack, defend, verify citations, and check jurisdiction-specific requirements.",
  },
  {
    icon: FileCheck,
    title: "Get Your Report",
    description: "Receive a scored report with every weakness found, every citation verified, and a rewritten brief.",
  },
];

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green-9)";
  if (score >= 50) return "var(--amber-9)";
  return "var(--crimson-9)";
}

function severityColor(
  severity: string
): "crimson" | "red" | "amber" | "gray" {
  switch (severity) {
    case "critical":
      return "crimson";
    case "high":
      return "red";
    case "medium":
      return "amber";
    default:
      return "gray";
  }
}

export default function LandingPage() {
  const sessions = getDemoSessions();
  const allFindings = getDemoFindings();

  const totalCases = sessions.length;
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length
  );
  const criticalFindings = allFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const totalFindings = allFindings.length;

  const criticalAndHigh = allFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5);

  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  return (
    <Box>
      {/* Hero Section */}
      <Box className="hero-gradient" py="9" px="4">
        <Flex
          direction="column"
          align="center"
          gap="6"
          style={{ maxWidth: 1100, margin: "0 auto" }}
        >
          <Box className="fade-in">
            <Badge color="crimson" variant="soft" size="2">
              6-Agent Adversarial Pipeline
            </Badge>
          </Box>

          <h1 className="hero-headline fade-in fade-in-delay-1">
            Your Legal Brief Has Weaknesses.
            <br />
            Find Them Before Opposing Counsel Does.
          </h1>

          <Text
            size="4"
            color="gray"
            align="center"
            className="fade-in fade-in-delay-2"
            style={{ maxWidth: 640 }}
          >
            Six AI agents stress-test your brief using the same adversarial
            method that has powered legal systems for centuries -- attack,
            defend, judge, verify, and rewrite.
          </Text>

          <Flex gap="4" className="fade-in fade-in-delay-3" wrap="wrap" justify="center">
            <a href="#dashboard">
              <Button size="4" variant="solid" color="crimson" style={{ cursor: "pointer" }}>
                Try the Demo
                <ArrowRight size={18} />
              </Button>
            </a>
            <a href="#research" style={{ textDecoration: "none" }}>
              <Button size="4" variant="outline" color="gray" style={{ cursor: "pointer" }}>
                See the Research
              </Button>
            </a>
          </Flex>
        </Flex>
      </Box>

      {/* Pipeline Visualization */}
      <Box py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Flex direction="column" gap="6" align="center" className="fade-in">
          <Heading size="5" align="center" color="gray">
            The 6-Agent Pipeline
          </Heading>
          <Flex
            align="center"
            justify="center"
            gap="2"
            wrap="wrap"
            style={{ width: "100%" }}
          >
            {agents.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <Flex key={agent.name} align="center" gap="2">
                  <Flex
                    direction="column"
                    align="center"
                    gap="2"
                    className={`fade-in fade-in-delay-${Math.min(agent.delay, 3)}`}
                  >
                    <Box
                      className="pipeline-icon"
                      style={
                        {
                          "--pipe-color": agent.color,
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                        } as React.CSSProperties
                      }
                    >
                      <Icon size={24} />
                    </Box>
                    <Text size="1" weight="medium" align="center" style={{ maxWidth: 80 }}>
                      {agent.name}
                    </Text>
                  </Flex>
                  {i < agents.length - 1 && (
                    <ChevronRight
                      size={18}
                      style={{
                        color: "var(--gray-7)",
                        flexShrink: 0,
                        marginBottom: 20,
                      }}
                    />
                  )}
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </Box>

      <Box px="4">
        <Separator size="4" style={{ maxWidth: 1100, margin: "0 auto" }} />
      </Box>

      {/* Stats Row */}
      <Box py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Grid columns={{ initial: "2", sm: "4" }} gap="4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <Flex direction="column" align="center" gap="1" py="2">
                <Heading
                  size="8"
                  style={{ color: "var(--crimson-9)", letterSpacing: "-0.03em" }}
                >
                  {stat.number}
                </Heading>
                <Text size="2" weight="medium" align="center">
                  {stat.label}
                </Text>
                <Text size="1" color="gray" align="center">
                  {stat.source}
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>
      </Box>

      <Box px="4">
        <Separator size="4" style={{ maxWidth: 1100, margin: "0 auto" }} />
      </Box>

      {/* How It Works */}
      <Box py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Flex direction="column" gap="6">
          <Flex direction="column" gap="2" align="center">
            <Badge color="crimson" variant="soft" size="2">
              Simple Process
            </Badge>
            <Heading size="7" align="center">
              How It Works
            </Heading>
          </Flex>

          <Grid columns={{ initial: "1", sm: "3" }} gap="6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} variant="surface" className={`fade-in fade-in-delay-${Math.min(i, 3)}`}>
                  <Flex direction="column" gap="3" p="2" align="center">
                    <Flex align="center" gap="3">
                      <Text
                        size="8"
                        weight="bold"
                        style={{ color: "var(--crimson-a4)", lineHeight: 1 }}
                      >
                        {i + 1}
                      </Text>
                      <Box
                        className="pipeline-icon"
                        style={
                          {
                            "--pipe-color": "var(--crimson-9)",
                          } as React.CSSProperties
                        }
                      >
                        <Icon size={20} />
                      </Box>
                    </Flex>
                    <Heading size="4" align="center">
                      {step.title}
                    </Heading>
                    <Text size="2" color="gray" align="center" style={{ lineHeight: 1.6 }}>
                      {step.description}
                    </Text>
                  </Flex>
                </Card>
              );
            })}
          </Grid>

        </Flex>
      </Box>

      <Box px="4">
        <Separator size="4" style={{ maxWidth: 1100, margin: "0 auto" }} />
      </Box>

      {/* Research Section */}
      <Box id="research" py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <WhyThisWorks />
      </Box>

      <Box px="4">
        <Separator size="4" style={{ maxWidth: 1100, margin: "0 auto" }} />
      </Box>

      {/* Dashboard Section */}
      <Box id="dashboard" py="8" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Flex direction="column" gap="6">
          <Flex direction="column" gap="1" px="4">
            <Flex align="center" gap="2">
              <Scale size={24} />
              <Heading size="7">Dashboard</Heading>
            </Flex>
            <Text size="3" weight="medium">
              Find the weaknesses in your brief before opposing counsel does.
            </Text>
            <Text size="2" color="gray">
              Upload a brief and get an instant adversarial tear-down — weak arguments, shaky citations, and jurisdiction-specific risks scored and ranked.
            </Text>
          </Flex>

          {/* Dashboard Stats Row */}
          <Grid columns={{ initial: "2", sm: "4" }} gap="4" px="4">
            <Card>
              <Flex direction="column" align="center" gap="1" py="2">
                <Flex align="center" gap="2">
                  <FileSearch size={18} />
                  <Text size="1" color="gray" weight="medium">
                    Cases Analyzed
                  </Text>
                </Flex>
                <Heading size="8">{totalCases}</Heading>
              </Flex>
            </Card>

            <Card>
              <Flex direction="column" align="center" gap="1" py="2">
                <Flex align="center" gap="2">
                  <BarChart3 size={18} />
                  <Text size="1" color="gray" weight="medium">
                    Average Score
                  </Text>
                </Flex>
                <Heading size="8">{avgScore}</Heading>
              </Flex>
            </Card>

            <Card>
              <Flex direction="column" align="center" gap="1" py="2">
                <Flex align="center" gap="2">
                  <AlertTriangle size={18} />
                  <Text size="1" color="gray" weight="medium">
                    Critical Findings
                  </Text>
                </Flex>
                <Heading size="8" style={{ color: "var(--crimson-9)" }}>
                  {criticalFindings}
                </Heading>
              </Flex>
            </Card>

            <Card>
              <Flex direction="column" align="center" gap="1" py="2">
                <Flex align="center" gap="2">
                  <Shield size={18} />
                  <Text size="1" color="gray" weight="medium">
                    Total Findings
                  </Text>
                </Flex>
                <Heading size="8">{totalFindings}</Heading>
              </Flex>
            </Card>
          </Grid>

          <Box px="4">
            <Separator size="4" />
          </Box>

          {/* Cases Grid */}
          <Flex direction="column" gap="3" px="4">
            <Heading size="5">Cases</Heading>
            <Grid columns={{ initial: "1", md: "2" }} gap="4">
              {sessions.map((session) => {
                const findings = getDemoFindings(session.id);
                const severityCounts = findings.reduce(
                  (acc, f) => {
                    acc[f.severity] = (acc[f.severity] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                );

                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card
                      style={{ cursor: "pointer" }}
                      variant="surface"
                    >
                      <Flex direction="column" gap="3">
                        <Flex justify="between" align="start" gap="3">
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Heading size="4">{session.brief_title}</Heading>
                            <Badge
                              variant="soft"
                              color="blue"
                              size="1"
                              style={{ alignSelf: "flex-start" }}
                            >
                              {session.jurisdiction}
                            </Badge>
                          </Flex>
                          <Box
                            className="score-ring"
                            style={{
                              "--score-color": scoreColor(session.overall_score),
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              border: `3px solid ${scoreColor(session.overall_score)}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            } as React.CSSProperties}
                          >
                            <Text
                              size="4"
                              weight="bold"
                              style={{ color: scoreColor(session.overall_score) }}
                            >
                              {session.overall_score}
                            </Text>
                          </Box>
                        </Flex>

                        <Flex gap="2" wrap="wrap">
                          {severityCounts.critical && (
                            <Badge color="crimson" variant="soft" size="1">
                              {severityCounts.critical} critical
                            </Badge>
                          )}
                          {severityCounts.high && (
                            <Badge color="red" variant="soft" size="1">
                              {severityCounts.high} high
                            </Badge>
                          )}
                          {severityCounts.medium && (
                            <Badge color="amber" variant="soft" size="1">
                              {severityCounts.medium} medium
                            </Badge>
                          )}
                          {severityCounts.low && (
                            <Badge color="gray" variant="soft" size="1">
                              {severityCounts.low} low
                            </Badge>
                          )}
                        </Flex>

                        <Text size="1" color="gray">
                          {new Date(session.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </Text>
                      </Flex>
                    </Card>
                  </Link>
                );
              })}
            </Grid>
          </Flex>

          <Box px="4">
            <Separator size="4" />
          </Box>

          {/* Recent Critical Findings */}
          <Flex direction="column" gap="3" px="4">
            <Heading size="5">Recent Critical Findings</Heading>
            <Flex direction="column" gap="3">
              {criticalAndHigh.map((finding) => {
                const session = sessionMap[finding.session_id];
                return (
                  <Link
                    key={finding.id}
                    href={`/sessions/${finding.session_id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Card variant="surface" style={{ cursor: "pointer" }}>
                      <Flex direction="column" gap="2">
                        <Flex justify="between" align="center">
                          <Text size="1" color="gray">
                            {session?.brief_title}
                          </Text>
                          <Badge
                            color={severityColor(finding.severity)}
                            variant="soft"
                            size="1"
                          >
                            {finding.severity}
                          </Badge>
                        </Flex>
                        <Text
                          size="2"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {finding.description}
                        </Text>
                      </Flex>
                    </Card>
                  </Link>
                );
              })}
            </Flex>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
