"use client";

import { useState } from "react";
import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Separator,
  Tabs,
  Button,
} from "@radix-ui/themes";
import {
  AlertTriangle,
  FileSearch,
  BarChart3,
  Clock,
  ChevronRight,
  ChevronDown,
  Shield,
} from "lucide-react";
import { HowItWorks } from "@repo/ui/how-it-works";
import type { Paper, PipelineAgent, Stat } from "@repo/ui/how-it-works";
import {
  getDemoSessions,
  getDemoFindings,
  getDemoAuditTrail,
} from "@/lib/demo-data";
import type { DemoAuditEntry } from "@/lib/demo-data";

// ─── Data ──────────────────────────────────────────────────────────

const papers: Paper[] = [
  {
    slug: "paper-0",
    number: 1,
    title: "AI Safety via Debate",
    category: "AI Debate",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Irving, Christiano & Amodei",
    year: 2018,
    venue: "arXiv 1805.00899",
    finding:
      "Two AI agents debating can answer questions in PSPACE -- exponentially harder than what a single judge could verify alone. The authors explicitly cite legal adversarial proceedings as the motivating analogy.",
    relevance:
      "Our Attacker/Defender/Judge pipeline is a direct implementation of this framework, applied to legal brief analysis.",
    url: "https://arxiv.org/abs/1805.00899",
    categoryColor: "var(--crimson-9)",
  },
  {
    slug: "paper-1",
    number: 2,
    title:
      "Debating with More Persuasive LLMs Leads to More Truthful Answers",
    category: "AI Debate",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Khan, Hughes, Valentine et al.",
    year: 2024,
    venue: "ICML 2024 (Best Paper Award)",
    finding:
      "When two LLM experts debate, non-expert judges achieve 76% accuracy (models) and 88% accuracy (humans), vs. 48% and 60% baselines. Debate helps weaker agents evaluate stronger ones.",
    relevance:
      "Empirically proves our core mechanism: structured debate between AI agents surfaces truth even when the judge is less expert than the debaters.",
    url: "https://arxiv.org/abs/2402.06782",
    categoryColor: "var(--crimson-9)",
  },
  {
    slug: "paper-2",
    number: 3,
    title:
      "Improving Factuality and Reasoning through Multiagent Debate",
    category: "Multi-Agent",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Du, Li, Torralba, Tenenbaum & Mordatch",
    year: 2024,
    venue: "ICML 2024",
    finding:
      "Multi-agent debate boosts reasoning accuracy by +15 percentage points on arithmetic and +8 on math reasoning. Even when all agents start wrong, debate converges on the correct answer.",
    relevance:
      "Validates our multi-round approach: 3 agents debating over 2+ rounds catch errors that a single pass never would.",
    url: "https://arxiv.org/abs/2305.14325",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "paper-3",
    number: 4,
    title:
      "Encouraging Divergent Thinking in LLMs through Multi-Agent Debate",
    category: "Multi-Agent",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Liang, He, Jiao, Wang et al.",
    year: 2024,
    venue: "EMNLP 2024",
    finding:
      'Identifies the "Degeneration-of-Thought" problem: LLMs become locked into initial (potentially incorrect) positions during self-reflection. Multi-agent debate with a judge breaks this pattern.',
    relevance:
      "Explains exactly why single-agent brief review fails -- the model commits to its first reading and cannot self-correct. Our adversarial structure forces genuine re-examination.",
    url: "https://arxiv.org/abs/2305.19118",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "paper-4",
    number: 5,
    title:
      "Large Legal Fictions: Profiling Legal Hallucinations in LLMs",
    category: "Hallucination",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Dahl, Magesh, Suzgun & Ho (Stanford)",
    year: 2024,
    venue: "Journal of Legal Analysis",
    finding:
      "LLMs hallucinate legal facts 69-88% of the time on verifiable questions about federal court cases. GPT-4 hallucinated 58%, GPT-3.5 at 69%, Llama 2 at 88%.",
    relevance:
      "The scientific basis for our Citation Verifier agent. Single-pass AI cannot be trusted with legal citations -- period.",
    url: "https://arxiv.org/abs/2401.01301",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "paper-5",
    number: 6,
    title:
      "Hallucination-Free? Assessing Reliability of Leading AI Legal Research Tools",
    category: "Hallucination",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Magesh, Surani, Dahl et al. (Stanford)",
    year: 2025,
    venue: "Journal of Empirical Legal Studies",
    finding:
      "Even purpose-built legal AI tools hallucinate: Lexis+ AI at 17%, Westlaw AI at 33%, GPT-4 at 43%. RAG alone does not solve the legal hallucination problem.",
    relevance:
      "Even the best single-pass tools fail. Adversarial verification provides the additional layer that RAG-based tools lack.",
    url: "https://arxiv.org/abs/2405.20362",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "paper-6",
    number: 7,
    title: "Procedural Justice: A Psychological Analysis",
    category: "Legal Scholarship",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Thibaut & Walker",
    year: 1975,
    venue: "Lawrence Erlbaum Associates",
    finding:
      "Landmark empirical study comparing adversarial and inquisitorial procedures. Found that adversarial systems -- where parties control evidence presentation -- produce more thorough fact-finding than any single investigator.",
    relevance:
      "The foundational experiment proving adversarial systems work. 50 years of legal scholarship builds on this. We apply it to AI.",
    url: "https://scholarship.law.duke.edu/cgi/viewcontent.cgi?article=2648&context=dlj",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "paper-7",
    number: 8,
    title:
      "Mata v. Avianca, Inc. -- The Case That Changed Legal AI",
    category: "Case Law",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Judge P. Kevin Castel, S.D.N.Y.",
    year: 2023,
    venue: "1:22-cv-01461 (S.D.N.Y.)",
    finding:
      "Lawyer sanctioned $5,000 for filing a ChatGPT-generated brief with 6 fabricated cases. Since then, $31K+ in combined sanctions across courts and 300+ judges now require AI citation verification.",
    relevance:
      "The landmark wake-up call. Our system would have caught every fabricated citation before filing.",
    url: "https://law.justia.com/cases/federal/district-courts/new-york/nysdce/1:2022cv01461/575368/54/",
    categoryColor: "var(--green-9)",
  },
];

const researchStats: Stat[] = [
  {
    number: "58%",
    label: "GPT-4 legal hallucination rate",
    source: "Stanford HAI, Journal of Legal Analysis 2024",
    paperIndex: 4,
  },
  {
    number: "+15pp",
    label: "Accuracy boost from multi-agent debate",
    source: "Du et al., ICML 2024",
    paperIndex: 2,
  },
  {
    number: "300+",
    label: "Judges now require AI citation verification",
    source: "Post Mata v. Avianca standing orders",
    paperIndex: 7,
  },
  {
    number: "$31K",
    label: "Sanctions for AI-fabricated citations",
    source: "Combined across U.S. courts, 2023-2025",
    paperIndex: 7,
  },
];

const agentPipeline: PipelineAgent[] = [
  {
    name: "Attacker",
    description:
      "The adversarial probe. Grounded in the AI Safety via Debate framework and red-teaming methodology -- adversarial agents expose flaws a cooperative reviewer would miss.",
    researchBasis: "Irving et al. (2018), Perez et al. (2022)",
    paperIndices: [0],
  },
  {
    name: "Defender",
    description:
      "Multi-agent debate shows wrong initial answers converge on truth through rounds of challenge. The Defender breaks the Degeneration-of-Thought trap.",
    researchBasis: "Du et al. (ICML 2024), Liang et al. (EMNLP 2024)",
    paperIndices: [2, 3],
  },
  {
    name: "Judge",
    description:
      "Non-expert judges achieve 88% accuracy when aided by structured debate vs. 60% baseline. The Judge leverages adversarial structure to make better decisions.",
    researchBasis: "Khan et al. (ICML 2024 Best Paper)",
    paperIndices: [1],
  },
  {
    name: "Citation Verifier",
    description:
      "With 58-88% hallucination rates on legal citations -- and even Lexis+ AI wrong 17% of the time -- a dedicated verification agent is a professional obligation.",
    researchBasis: "Stanford HAI (2024, 2025)",
    paperIndices: [4, 5],
  },
  {
    name: "Jurisdiction Expert",
    description:
      "A brief that wins in one jurisdiction can lose in another. Procedural precision is the adversarial system's core requirement -- and its greatest strength.",
    researchBasis: "Thibaut & Walker (1975)",
    paperIndices: [6],
  },
  {
    name: "Brief Rewriter",
    description:
      "The lesson of $31K+ in sanctions: never file unreviewed AI output. The Rewriter produces a revised brief only after 5 other agents have vetted every claim.",
    researchBasis: "Mata v. Avianca (2023)",
    paperIndices: [7],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────

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

function agentBadgeColor(
  agent: DemoAuditEntry["agent"]
): "crimson" | "blue" | "amber" {
  switch (agent) {
    case "attacker":
      return "crimson";
    case "defender":
      return "blue";
    case "judge":
      return "amber";
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SeverityBadges({ sessionId }: { sessionId: string }) {
  const findings = getDemoFindings(sessionId);
  const sd = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return (
    <Flex gap="2" wrap="wrap">
      {sd.critical ? (
        <Badge color="crimson" variant="soft" size="1">
          {sd.critical} critical
        </Badge>
      ) : null}
      {sd.high ? (
        <Badge color="red" variant="soft" size="1">
          {sd.high} high
        </Badge>
      ) : null}
      {sd.medium ? (
        <Badge color="amber" variant="soft" size="1">
          {sd.medium} medium
        </Badge>
      ) : null}
      {sd.low ? (
        <Badge color="gray" variant="soft" size="1">
          {sd.low} low
        </Badge>
      ) : null}
    </Flex>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function HowItWorksClient() {
  const [selectedCase, setSelectedCase] = useState("floyd-v-nyc");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(
    new Set()
  );

  const sessions = getDemoSessions();
  const allFindings = getDemoFindings();
  const currentSession = sessions.find((s) => s.id === selectedCase)!;

  const totalCases = sessions.length;
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length
  );
  const criticalFindings = allFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const totalFindings = allFindings.length;

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Box>
      {/* ─── Hero Banner ─── */}
      <Box className="hero-gradient" py="9" px="4">
        <Flex
          direction="column"
          align="center"
          gap="5"
          style={{ maxWidth: 900, margin: "0 auto" }}
        >
          <Box className="fade-in">
            <Badge color="crimson" variant="soft" size="2">
              How It Works
            </Badge>
          </Box>
          <h1 className="hero-headline fade-in fade-in-delay-1">
            The Complete Guide to
            <br />
            Adversarial Brief Analysis
          </h1>
          <Text
            size="4"
            color="gray"
            align="center"
            className="fade-in fade-in-delay-2"
            style={{ maxWidth: 640 }}
          >
            8 research papers. 6 specialized agents. One adversarial pipeline
            that catches what single-pass AI review misses -- grounded in
            decades of legal tradition and cutting-edge AI safety research.
          </Text>
        </Flex>
      </Box>

      {/* ─── Shared UI: Stats, Roadmap, Pipeline, Paper Grid ─── */}
      <HowItWorks
        papers={papers}
        title=""
        stats={researchStats}
        agents={agentPipeline}
        subtitle="Click any paper to see the full research details."
      >
        {/* ─── Demo Case Explorer ─── */}
        <Box px="4">
          <Separator
            size="4"
            style={{ maxWidth: 1100, margin: "0 auto" }}
          />
        </Box>

        <Box py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2" align="center">
              <Badge color="crimson" variant="soft" size="2">
                Live Demo Data
              </Badge>
              <Heading size="7" align="center">
                Demo Case Explorer
              </Heading>
              <Text
                size="3"
                color="gray"
                align="center"
                style={{ maxWidth: 640 }}
              >
                Explore real adversarial analysis results across 4 cases.
              </Text>
            </Flex>

            {/* Aggregate stats */}
            <Grid columns={{ initial: "2", sm: "4" }} gap="4">
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
                  <Heading
                    size="8"
                    style={{ color: "var(--crimson-9)" }}
                  >
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

            {/* Case tabs */}
            <Tabs.Root
              value={selectedCase}
              onValueChange={(v) => {
                setSelectedCase(v);
                setExpandedFindings(new Set());
              }}
            >
              <Tabs.List style={{ flexWrap: "wrap" }}>
                {sessions.map((s) => (
                  <Tabs.Trigger key={s.id} value={s.id}>
                    <Flex align="center" gap="2">
                      <Box
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: `2px solid ${scoreColor(s.overall_score)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: scoreColor(s.overall_score),
                          flexShrink: 0,
                        }}
                      >
                        {s.overall_score}
                      </Box>
                      <Text size="1" style={{ maxWidth: 140 }} truncate>
                        {s.brief_title.split(" -- ")[0]}
                      </Text>
                    </Flex>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {sessions.map((s) => (
                <Tabs.Content key={s.id} value={s.id}>
                  <Flex direction="column" gap="5" pt="4">
                    <Flex gap="6" align="center" wrap="wrap">
                      <Flex direction="column" align="center" gap="1">
                        <Box
                          className="score-ring"
                          style={
                            {
                              "--score-color": scoreColor(s.overall_score),
                              width: 80,
                              height: 80,
                              fontSize: 24,
                            } as React.CSSProperties
                          }
                        >
                          {s.overall_score}
                        </Box>
                        <Text size="1" color="gray">
                          Overall Score
                        </Text>
                      </Flex>

                      <Flex direction="column" gap="2" style={{ flex: 1 }}>
                        <Text size="2" weight="medium">
                          {s.brief_title}
                        </Text>
                        <Badge
                          variant="soft"
                          color="blue"
                          size="1"
                          style={{ alignSelf: "flex-start" }}
                        >
                          {s.jurisdiction}
                        </Badge>
                        <SeverityBadges sessionId={s.id} />
                      </Flex>
                    </Flex>

                    <Separator size="4" />

                    <Flex direction="column" gap="3">
                      <Heading size="4">
                        Findings ({getDemoFindings(s.id).length})
                      </Heading>
                      {getDemoFindings(s.id).map((finding) => {
                        const isOpen = expandedFindings.has(finding.id);
                        return (
                          <Card
                            key={finding.id}
                            variant="surface"
                            style={{ cursor: "pointer" }}
                            onClick={() => toggleFinding(finding.id)}
                          >
                            <Flex direction="column" gap="2">
                              <Flex
                                justify="between"
                                align="center"
                                gap="2"
                              >
                                <Flex align="center" gap="2">
                                  <Badge
                                    color={severityColor(finding.severity)}
                                    variant="soft"
                                    size="1"
                                  >
                                    {finding.severity}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    size="1"
                                    color="gray"
                                  >
                                    {finding.type}
                                  </Badge>
                                  <Text size="1" color="gray">
                                    Round {finding.round}
                                  </Text>
                                </Flex>
                                {isOpen ? (
                                  <ChevronDown
                                    size={14}
                                    style={{ color: "var(--gray-8)" }}
                                  />
                                ) : (
                                  <ChevronRight
                                    size={14}
                                    style={{ color: "var(--gray-8)" }}
                                  />
                                )}
                              </Flex>

                              <Text
                                size="2"
                                style={{
                                  lineHeight: 1.6,
                                  ...(!isOpen
                                    ? {
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient:
                                          "vertical" as const,
                                        overflow: "hidden",
                                      }
                                    : {}),
                                }}
                              >
                                {finding.description}
                              </Text>

                              {isOpen && (
                                <>
                                  <Separator size="4" />
                                  <Flex direction="column" gap="1">
                                    <Text
                                      size="1"
                                      weight="medium"
                                      style={{
                                        color: "var(--green-11)",
                                      }}
                                    >
                                      Suggested Fix
                                    </Text>
                                    <Text
                                      size="2"
                                      style={{ lineHeight: 1.6 }}
                                    >
                                      {finding.suggested_fix}
                                    </Text>
                                  </Flex>
                                  <Text size="1" color="gray">
                                    Confidence:{" "}
                                    {Math.round(finding.confidence * 100)}%
                                  </Text>
                                </>
                              )}
                            </Flex>
                          </Card>
                        );
                      })}
                    </Flex>
                  </Flex>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </Flex>
        </Box>

        {/* ─── Audit Trail Timeline ─── */}
        <Box px="4">
          <Separator
            size="4"
            style={{ maxWidth: 1100, margin: "0 auto" }}
          />
        </Box>

        <Box py="8" px="4" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2" align="center">
              <Badge color="crimson" variant="soft" size="2">
                Full Transparency
              </Badge>
              <Heading size="7" align="center">
                Audit Trail
              </Heading>
              <Text
                size="3"
                color="gray"
                align="center"
                style={{ maxWidth: 640 }}
              >
                Every agent action, every round, fully traceable. Viewing:{" "}
                {currentSession.brief_title.split(" -- ")[0]}
              </Text>
            </Flex>

            <Tabs.Root
              value={selectedCase}
              onValueChange={(v) => {
                setSelectedCase(v);
                setExpandedFindings(new Set());
              }}
            >
              <Tabs.List style={{ flexWrap: "wrap" }}>
                {sessions.map((s) => (
                  <Tabs.Trigger key={s.id} value={s.id}>
                    <Text size="1" truncate style={{ maxWidth: 160 }}>
                      {s.brief_title.split(" -- ")[0]}
                    </Text>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {sessions.map((s) => {
                const trail = getDemoAuditTrail(s.id);
                return (
                  <Tabs.Content key={s.id} value={s.id}>
                    <Flex direction="column" gap="0" pt="4">
                      {trail.map((entry, i) => {
                        const isLast = i === trail.length - 1;
                        const dotColor =
                          entry.agent === "attacker"
                            ? "var(--crimson-9)"
                            : entry.agent === "defender"
                              ? "var(--blue-9)"
                              : "var(--amber-9)";
                        return (
                          <Flex
                            key={entry.id}
                            gap="3"
                            style={{
                              paddingBottom: isLast ? 0 : 16,
                            }}
                          >
                            <Flex
                              direction="column"
                              align="center"
                              style={{ flexShrink: 0, width: 20 }}
                            >
                              <Box
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  background: dotColor,
                                  flexShrink: 0,
                                  marginTop: 4,
                                }}
                              />
                              {!isLast && (
                                <Box
                                  style={{
                                    width: 2,
                                    flex: 1,
                                    background:
                                      "var(--gray-a4, rgba(0,0,0,0.15))",
                                    marginTop: 4,
                                  }}
                                />
                              )}
                            </Flex>

                            <Flex
                              direction="column"
                              gap="1"
                              style={{ flex: 1, paddingBottom: 4 }}
                            >
                              <Flex
                                align="center"
                                gap="2"
                                wrap="wrap"
                              >
                                <Badge
                                  color={agentBadgeColor(entry.agent)}
                                  variant="soft"
                                  size="1"
                                >
                                  {entry.agent}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  size="1"
                                  color="gray"
                                >
                                  {entry.action.replace(/_/g, " ")}
                                </Badge>
                                <Text size="1" color="gray">
                                  Round {entry.round}
                                </Text>
                              </Flex>
                              <Text
                                size="2"
                                style={{ lineHeight: 1.6 }}
                              >
                                {entry.output_summary}
                              </Text>
                              <Flex align="center" gap="1">
                                <Clock
                                  size={10}
                                  style={{ color: "var(--gray-8)" }}
                                />
                                <Text
                                  size="1"
                                  style={{
                                    color: "var(--gray-8)",
                                  }}
                                >
                                  {formatTime(entry.created_at)}
                                </Text>
                              </Flex>
                            </Flex>
                          </Flex>
                        );
                      })}
                    </Flex>
                  </Tabs.Content>
                );
              })}
            </Tabs.Root>
          </Flex>
        </Box>
      </HowItWorks>
    </Box>
  );
}
